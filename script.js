
const SUPABASE_URL = "https://gbymbqburckkwihaxzso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NmpdQiwtE5moynmBiqjmig__oSc_bTF";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

async function loadPublicGalleries() {
  const statusElement = document.getElementById("connection-status");
  const gallerySection = document.getElementById("galeri");

  if (!gallerySection) return;

  const oldGalleryList =
    document.getElementById("public-gallery-list");

  if (oldGalleryList) {
    oldGalleryList.remove();
  }

  const emptyState = gallerySection.querySelector(".empty-state");

  try {
    const { data: galleries, error } = await supabaseClient
      .from("galeri_acara")
      .select(
        "id, nama_acara, slug, tanggal_acara, deskripsi"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (statusElement) {
      statusElement.textContent = "Koneksi Supabase berhasil!";
      statusElement.className = "connection-success";
    }

    if (!galleries || galleries.length === 0) {
      if (emptyState) {
        emptyState.style.display = "";
      }
      return;
    }

    if (emptyState) {
      emptyState.style.display = "none";
    }

    const galleryList = document.createElement("div");
    galleryList.id = "public-gallery-list";
    galleryList.className = "public-gallery-list";

    for (const gallery of galleries) {
      const card = document.createElement("article");
      card.className = "public-gallery-card";

      const title = document.createElement("h3");
      title.textContent = gallery.nama_acara;

      const description = document.createElement("p");
      description.textContent =
        gallery.deskripsi || "Galeri foto acara.";

      const date = document.createElement("p");
      date.textContent = gallery.tanggal_acara
        ? new Date(gallery.tanggal_acara + "T00:00:00")
            .toLocaleDateString("id-ID")
        : "";

      const galleryLink = document.createElement("a");
      galleryLink.href =
        `galeri.html?slug=${encodeURIComponent(gallery.slug)}`;
      galleryLink.className = "public-gallery-link";
      galleryLink.textContent = "Lihat Galeri";

      card.append(
        title,
        description,
        date,
        galleryLink
      );

      galleryList.appendChild(card);
    }

    gallerySection.appendChild(galleryList);
  } catch (error) {
    console.error("Gagal memuat galeri:", error);

    if (statusElement) {
      statusElement.textContent =
        "Galeri belum dapat dimuat. Silakan coba lagi.";
      statusElement.className = "connection-error";
    }
  }
}

loadPublicGalleries();
