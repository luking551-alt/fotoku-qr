
const SUPABASE_URL = "https://gbymbqburckkwihaxzso.supabase.co";

const FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/galeri-publik`;

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

const statusElement = document.getElementById("gallery-status");
const titleElement = document.getElementById("gallery-title");
const descriptionElement = document.getElementById("gallery-description");
const dateElement = document.getElementById("gallery-date");
const photoGrid = document.getElementById("photo-grid");

async function loadGallery() {
  if (!slug) {
    statusElement.textContent =
      "Tautan galeri tidak lengkap. Periksa kembali tautan dari fotografer.";
    return;
  }

  try {
    statusElement.textContent = "Memuat foto galeri...";

    const response = await fetch(
      `${FUNCTION_URL}?slug=${encodeURIComponent(slug)}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Galeri tidak dapat dimuat."
      );
    }

    const gallery = result.gallery;
    const photos = result.photos || [];

    titleElement.textContent = gallery.nama_acara;
    descriptionElement.textContent =
      gallery.deskripsi || "Kenangan terbaik dalam satu tempat.";

    dateElement.textContent = gallery.tanggal_acara
      ? new Date(gallery.tanggal_acara + "T00:00:00")
          .toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
          })
      : "";

    photoGrid.replaceChildren();

    if (photos.length === 0) {
      statusElement.textContent =
        "Belum ada foto di galeri ini.";
      return;
    }

    for (const photo of photos) {
      const card = document.createElement("article");
      card.className = "public-gallery-card";

      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = photo.file_name || "Foto acara";
      image.loading = "lazy";
      image.style.width = "100%";
      image.style.height = "auto";
      image.style.display = "block";
      image.style.borderRadius = "10px";

      
const downloadLink = document.createElement("button");
downloadLink.type = "button";
downloadLink.textContent = "Unduh foto";
downloadLink.className = "primary-button";
downloadLink.style.display = "inline-block";
downloadLink.style.marginTop = "10px";

downloadLink.addEventListener("click", async () => {
  const originalText = downloadLink.textContent;
  downloadLink.disabled = true;
  downloadLink.textContent = "Menyiapkan unduhan...";

  try {
    const response = await fetch(photo.url);

    if (!response.ok) {
      throw new Error("Foto tidak berhasil diambil.");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const temporaryLink = document.createElement("a");
    temporaryLink.href = objectUrl;
    temporaryLink.download = photo.file_name || "foto.jpg";

    document.body.appendChild(temporaryLink);
    temporaryLink.click();
    temporaryLink.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  } catch (error) {
    console.error("Unduhan foto gagal:", error);
    alert("Foto gagal diunduh. Silakan coba lagi.");
  } finally {
    downloadLink.disabled = false;
    downloadLink.textContent = originalText;
  }
});

      card.append(image, downloadLink);
      photoGrid.appendChild(card);
    }

    statusElement.textContent =
      `${photos.length} foto berhasil dimuat.`;
  } catch (error) {
    console.error("Gagal memuat galeri:", error);

    statusElement.textContent =
      "Galeri gagal dimuat. Silakan coba lagi nanti.";
  }
}

loadGallery();
