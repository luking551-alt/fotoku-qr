```javascript
const SUPABASE_URL = "Https://gbymbqburckkwihaxzso.supabase.co";
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

let adminUser = null;

// Memeriksa login dan hak akses admin
async function checkAdmin() {
  try {
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      window.location.replace("admin.html");
      return;
    }

    if (data.user.app_metadata?.role !== "admin") {
      await client.auth.signOut();
      window.location.replace("admin.html");
      return;
    }

    adminUser = data.user;

    statusElement.textContent =
      "Login berhasil. Anda terverifikasi sebagai admin.";
    statusElement.style.color = "#287a45";
    emailElement.textContent = "Akun: " + data.user.email;

    await loadGalleries();
  } catch (error) {
    console.error("Pemeriksaan admin gagal:", error);
    statusElement.textContent =
      "Tidak dapat memverifikasi akun. Silakan login kembali.";
  }
}

// Membuat slug unik untuk tautan galeri
function createSlug() {
  return "galeri-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// Membuat galeri baru
galleryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminUser) {
    galleryStatus.textContent = "Akun admin belum terverifikasi.";
    return;
  }

  const namaAcara = document.getElementById("nama-acara").value.trim();
  const tanggalAcara = document.getElementById("tanggal-acara").value;
  const deskripsiAcara = document.getElementById("deskripsi-acara").value.trim();

  if (!namaAcara) {
    galleryStatus.textContent = "Nama acara wajib diisi.";
    return;
  }

  createGalleryButton.disabled = true;
  galleryStatus.textContent = "Sedang menyimpan galeri...";

  try {
    const { data, error } = await client
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
      console.error("Gagal membuat galeri:", error);
      galleryStatus.textContent =
        "Galeri gagal disimpan: " + error.message;
      return;
    }

    galleryStatus.textContent = "Galeri berhasil dibuat!";
    galleryForm.reset();

    await loadGalleries();
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    galleryStatus.textContent =
      "Terjadi kesalahan saat menyimpan galeri.";
  } finally {
    createGalleryButton.disabled = false;
  }
});

// Menampilkan galeri milik admin yang sedang login
async function loadGalleries() {
  galleryList.textContent = "Memuat galeri...";

  const { data, error } = await client
    .from("galeri_acara")
    .select("id, nama_acara, slug, tanggal_acara, deskripsi, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat galeri:", error);
    galleryList.textContent =
      "Galeri gagal dimuat: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    galleryList.textContent = "Belum ada galeri. Silakan buat galeri pertama Anda.";
    return;
  }

  galleryList.replaceChildren();

  data.forEach((gallery) => {
    const item = document.createElement("div");
    item.className = "gallery-item";

    const title = document.createElement("h4");
    title.textContent = gallery.nama_acara;

    const date = document.createElement("p");
    date.textContent = gallery.tanggal_acara
      ? "Tanggal acara: " + gallery.tanggal_acara
      : "Tanggal acara belum ditentukan";

    const description = document.createElement("p");
    description.textContent = gallery.deskripsi || "Tidak ada deskripsi.";

    const slug = document.createElement("p");
    slug.textContent = "Kode galeri: " + gallery.slug;

    item.append(title, date, description, slug);
    galleryList.appendChild(item);
  });
}

// Logout admin
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  const { error } = await client.auth.signOut();

  if (error) {
    statusElement.textContent = "Gagal keluar. Silakan coba lagi.";
    logoutButton.disabled = false;
    return;
  }

  window.location.replace("admin.html");
});

checkAdmin();
```