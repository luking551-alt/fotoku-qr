const SUPABASE_URL = "https://gbymbqburckkwihaxzso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NmpdQiwtE5moynmBiqjmig__oSc_bTF";

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
      throw new Error(`Gagal mengunggah ${file.name}: ${error.message}`);
    }

    uploadedPhotos.push(data);
  }

  return uploadedPhotos;
}



let adminUser = null;

// Memeriksa apakah pengguna sudah login sebagai admin
async function checkAdmin() {
  try {
    const result = await client.auth.getUser();
    const user = result.data.user;

    if (result.error || !user) {
      window.location.replace("admin.html");
      return;
    }

    if (user.app_metadata?.role !== "admin") {
      await client.auth.signOut();
      window.location.replace("admin.html");
      return;
    }

    adminUser = user;

    statusElement.textContent =
      "Login berhasil. Anda terverifikasi sebagai admin.";
    statusElement.style.color = "#287a45";

    emailElement.textContent = "Akun: " + user.email;

    await loadGalleries();
  } catch (error) {
    console.error("Pemeriksaan admin gagal:", error);
    statusElement.textContent =
      "Gagal memeriksa akun. Silakan periksa koneksi dan login kembali.";
  }
}

// Membuat kode unik untuk setiap galeri
function createSlug() {
  return "galeri-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
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
      const result = await client
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

      if (result.error) {
        console.error("Gagal menyimpan galeri:", result.error);
        galleryStatus.textContent =
          "Galeri gagal disimpan: " + result.error.message;
        return;
      }

const photoContainer = document.createElement("div");
photoContainer.className = "gallery-photos";

const photoResult = await client
  .from("photos")
  .select("id, storage_path, file_name")
  .eq("gallery_id", gallery.id);

if (photoResult.error) {
  console.error("Gagal memuat foto:", photoResult.error);
} else {
  for (const photo of photoResult.data || []) {
    const photoName = document.createElement("p");
   
const { data: imageData, error: imageError } = await client.storage
  .from("fotoku-photos")
  .createSignedUrl(photo.storage_path, 3600);

if (imageError) {
  console.error("Gagal membuat URL foto:", imageError);
  const photoName = document.createElement("p");
  photoName.textContent = "Foto: " + photo.file_name;
  photoContainer.appendChild(photoName);
} else {
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
}

      galleryStatus.textContent = "Galeri berhasil dibuat!";
      galleryForm.reset();

      await loadGalleries();
    } catch (error) {
      console.error("Kesalahan saat membuat galeri:", error);
      galleryStatus.textContent =
        "Terjadi kesalahan. Silakan coba kembali.";
    } finally {
      createGalleryButton.disabled = false;
    }
  });
}

// Memuat daftar galeri
async function loadGalleries() {
  if (!galleryList || !adminUser) {
    return;
  }

  galleryList.textContent = "Memuat galeri...";

  try {
    const result = await client
      .from("galeri_acara")
      .select("id, nama_acara, slug, tanggal_acara, deskripsi, created_at")
      .order("created_at", { ascending: false });

    if (result.error) {
      console.error("Gagal memuat galeri:", result.error);
      galleryList.textContent =
        "Galeri gagal dimuat: " + result.error.message;
      return;
    }

    const galleries = result.data || [];
    galleryList.replaceChildren();

    if (galleries.length === 0) {
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

  item.appendChild(title);
  item.appendChild(date);
  item.appendChild(description);
  item.appendChild(slug);

  const photoContainer = document.createElement("div");
  photoContainer.className = "gallery-photos";

  const photoResult = await client
    .from("photos")
    .select("id, storage_path, file_name")
    .eq("gallery_id", gallery.id);

  if (photoResult.error) {
    console.error("Gagal memuat foto:", photoResult.error);
  } else {
    for (const photo of photoResult.data || []) {
      const { data: imageData, error: imageError } =
        await client.storage
          .from("fotoku-photos")
          .createSignedUrl(photo.storage_path, 3600);

      if (imageError) {
        console.error("Gagal membuat URL foto:", imageError);
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
  galleryList.appendChild(item);
}

  } catch (error) {
    console.error("Kesalahan saat memuat galeri:", error);
    galleryList.textContent =
      "Tidak dapat memuat galeri. Periksa koneksi Anda.";
  }
}

// Logout admin
if (logoutButton) {
  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;

    try {
      const result = await client.auth.signOut();

      if (result.error) {
        statusElement.textContent =
          "Gagal keluar. Silakan coba kembali.";
        logoutButton.disabled = false;
        return;
      }

      window.location.replace("admin.html");
    } catch (error) {
      console.error("Logout gagal:", error);
      statusElement.textContent = "Terjadi kesalahan saat logout.";
      logoutButton.disabled = false;
    }
  });
}

// Mulai pemeriksaan admin
checkAdmin();
