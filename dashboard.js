
const SUPABASE_URL = "https://gbymbqburckkwihaxzso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NmpdQiwtE5moynmBiqjmig__oSc_bTF";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const statusElement = document.getElementById("status");
const emailElement = document.getElementById("admin-email");
const logoutButton = document.getElementById("logout-button");

const galleryForm = document.getElementById("gallery-form");
const galleryList = document.getElementById("gallery-list");
const galleryStatus = document.getElementById("gallery-status");
const createGalleryButton = document.getElementById("create-gallery-button");
const fotoAcaraInput = document.getElementById("foto-acara");

let adminUser = null;

// Mengunggah foto ke Supabase Storage
async function uploadFotoAcara(files, galleryId) {
  const uploadedPhotos = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`File ${file.name} bukan gambar.`);
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`Ukuran ${file.name} melebihi 10 MB.`);
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop().toLowerCase()
      : "jpg";

    const filePath =
      `${adminUser.id}/${galleryId}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await client.storage
      .from("fotoku-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      throw new Error(
        `Gagal mengunggah ${file.name}: ${error.message}`
      );
    }

    uploadedPhotos.push(data);
  }

  return uploadedPhotos;
}

// Membuat kode unik untuk galeri
function createSlug() {
  return "galeri-" +
    crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// Membuat tautan galeri pengunjung
function getPublicGalleryUrl(slug) {
  return new URL(
    `galeri.html?slug=${encodeURIComponent(slug)}`,
    window.location.href
  ).href;
}

// Memeriksa login dan hak akses admin
async function checkAdmin() {
  try {
    const { data, error } = await client.auth.getUser();
    const user = data?.user;

    if (error || !user) {
      window.location.replace("admin.html");
      return;
    }

    if (user.app_metadata?.role !== "admin") {
      await client.auth.signOut();
      window.location.replace("admin.html");
      return;
    }

    adminUser = user;

    if (statusElement) {
      statusElement.textContent =
        "Login berhasil. Anda terverifikasi sebagai admin.";
      statusElement.style.color = "#287a45";
    }

    if (emailElement) {
      emailElement.textContent = "Akun: " + user.email;
    }

    await loadGalleries();
  } catch (error) {
    console.error("Pemeriksaan admin gagal:", error);

    if (statusElement) {
      statusElement.textContent =
        "Gagal memeriksa akun. Silakan periksa koneksi dan login kembali.";
    }
  }
}

// Membuat galeri baru
if (galleryForm) {
  galleryForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!adminUser) {
      galleryStatus.textContent =
        "Akun admin belum terverifikasi. Silakan login kembali.";
      return;
    }

    const namaAcara =
      document.getElementById("nama-acara").value.trim();

    const tanggalAcara =
      document.getElementById("tanggal-acara").value;

    const deskripsiAcara =
      document.getElementById("deskripsi-acara").value.trim();

    if (!namaAcara) {
      galleryStatus.textContent = "Nama acara wajib diisi.";
      return;
    }

    createGalleryButton.disabled = true;
    galleryStatus.textContent = "Sedang menyimpan galeri...";

    try {
      const { data: gallery, error } = await client
        .from("galeri_acara")
        .insert({
          user_id: adminUser.id,
          nama_acara: namaAcara,
          slug: createSlug(),
          tanggal_acara: tanggalAcara || null,
          deskripsi: deskripsiAcara || null
        })
        .select()
        .single();

      if (error) {
        throw new Error(
          "Galeri gagal disimpan: " + error.message
        );
      }

      const selectedFiles = Array.from(
        fotoAcaraInput?.files || []
      );

      if (selectedFiles.length > 0) {
        galleryStatus.textContent =
          "Galeri dibuat. Sedang mengunggah foto...";

        const uploadedPhotos = await uploadFotoAcara(
          selectedFiles,
          gallery.id
        );

        const photoRows = uploadedPhotos.map((photo, index) => ({
          gallery_id: gallery.id,
          storage_path: photo.path,
          file_name: selectedFiles[index].name
        }));

        const { error: photoError } = await client
          .from("photos")
          .insert(photoRows);

        if (photoError) {
          throw new Error(
            "Galeri dibuat, tetapi data foto gagal disimpan: " +
            photoError.message
          );
        }
      }

      galleryForm.reset();

      galleryStatus.textContent =
        "Galeri berhasil dibuat. Status awal: belum dipublikasikan.";

      await loadGalleries();
    } catch (error) {
      console.error("Kesalahan saat membuat galeri:", error);
      galleryStatus.textContent = error.message ||
        "Terjadi kesalahan. Silakan coba kembali.";
      await loadGalleries();
    } finally {
      createGalleryButton.disabled = false;
    }
  });
}

// Mengubah status publikasi galeri
async function togglePublication(gallery, nextStatus, button) {
  if (!adminUser) {
    galleryStatus.textContent =
      "Sesi admin tidak ditemukan. Silakan login kembali.";
    return;
  }

  const confirmation = nextStatus
    ? `Publikasikan galeri "${gallery.nama_acara}"?`
    : `Sembunyikan galeri "${gallery.nama_acara}" dari pengunjung?`;

  if (!window.confirm(confirmation)) return;

  button.disabled = true;
  galleryStatus.textContent = nextStatus
    ? "Sedang memublikasikan galeri..."
    : "Sedang menyembunyikan galeri...";

  try {
    const { error } = await client
      .from("galeri_acara")
      .update({ is_published: nextStatus })
      .eq("id", gallery.id)
      .eq("user_id", adminUser.id);

    if (error) {
      throw error;
    }

    galleryStatus.textContent = nextStatus
      ? "Galeri berhasil dipublikasikan."
      : "Galeri berhasil disembunyikan.";

    await loadGalleries();
  } catch (error) {
    console.error("Gagal mengubah publikasi:", error);

    galleryStatus.textContent =
      "Publikasi gagal: " + (error.message ||
        "Periksa kebijakan UPDATE RLS Supabase.");
    button.disabled = false;
  }
}

// Memuat daftar galeri dan foto di Dashboard
async function loadGalleries() {
  if (!galleryList || !adminUser) return;

  galleryList.textContent = "Memuat galeri...";

  try {
    const { data: galleries, error } = await client
      .from("galeri_acara")
      .select(
        "id, user_id, nama_acara, slug, tanggal_acara, deskripsi, created_at, is_published"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    galleryList.replaceChildren();

    if (!galleries || galleries.length === 0) {
      galleryList.textContent =
        "Belum ada galeri. Silakan buat galeri pertama Anda.";
      return;
    }

    for (const gallery of galleries) {
      const item = document.createElement("div");
      item.className = "gallery-item";

      const title = document.createElement("h4");
      title.textContent = gallery.nama_acara;

      const date = document.createElement("p");
      date.textContent = gallery.tanggal_acara
        ? "Tanggal acara: " + gallery.tanggal_acara
        : "Tanggal acara belum ditentukan";

      const description = document.createElement("p");
      description.textContent =
        gallery.deskripsi || "Tidak ada deskripsi.";

      const slug = document.createElement("p");
      slug.textContent = "Kode galeri: " + gallery.slug;

      const publicationStatus = document.createElement("p");
      publicationStatus.textContent = gallery.is_published
        ? "Status: Sudah dipublikasikan"
        : "Status: Belum dipublikasikan";

      const publicationButton = document.createElement("button");
      publicationButton.type = "button";
      publicationButton.textContent = gallery.is_published
        ? "Sembunyikan Galeri"
        : "Publikasikan";
      publicationButton.addEventListener("click", () => {
        togglePublication(
          gallery,
          !gallery.is_published,
          publicationButton
        );
      });

      item.append(
        title,
        date,
        description,
        slug,
        publicationStatus,
        publicationButton
      );

      const photoContainer = document.createElement("div");
      photoContainer.className = "gallery-photos";

      const { data: photos, error: photoError } = await client
        .from("photos")
        .select("id, storage_path, file_name")
        .eq("gallery_id", gallery.id);

      if (photoError) {
        console.error("Gagal memuat foto:", photoError);
      } else {
        for (const photo of photos || []) {
          const { data: imageData, error: imageError } =
            await client.storage
              .from("fotoku-photos")
              .createSignedUrl(photo.storage_path, 3600);

          if (imageError) {
            console.error(
              "Gagal membuat URL foto:",
              imageError
            );
            continue;
          }

          const image = document.createElement("img");
          image.src = imageData.signedUrl;
          image.alt = photo.file_name;
          image.style.width = "180px";
          image.style.maxWidth = "100%";
          image.style.height = "auto";
          image.style.objectFit = "cover";
          image.style.borderRadius = "8px";
          image.style.margin = "8px";

          photoContainer.appendChild(image);
        }
      }

      item.appendChild(photoContainer);

      if (gallery.is_published) {
        const publicUrl = getPublicGalleryUrl(gallery.slug);

        const link = document.createElement("a");
        link.href = publicUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Buka Galeri Pengunjung";

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.textContent = "Salin Tautan Galeri";

        copyButton.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(publicUrl);
            galleryStatus.textContent =
              "Tautan galeri berhasil disalin.";
          } catch (error) {
            window.prompt("Salin tautan galeri ini:", publicUrl);
          }
        });

        item.append(link, copyButton);
      }

      galleryList.appendChild(item);
    }
  } catch (error) {
    console.error("Kesalahan saat memuat galeri:", error);
    galleryList.textContent =
      "Tidak dapat memuat galeri: " + (error.message || "Periksa koneksi.");
  }
}

// Logout admin
if (logoutButton) {
  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;

    try {
      const { error } = await client.auth.signOut();

      if (error) throw error;

      window.location.replace("admin.html");
    } catch (error) {
      console.error("Logout gagal:", error);

      if (statusElement) {
        statusElement.textContent =
          "Gagal keluar: " + (error.message || "Silakan coba kembali.");
      }

      logoutButton.disabled = false;
    }
  });
}

// Mulai pemeriksaan admin
checkAdmin();
