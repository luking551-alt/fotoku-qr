
const cfg = window.FOTOKU_CONFIG;
const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
const list = document.getElementById("gallery-list");
const msg = document.getElementById("dashboard-message");
const panel = document.getElementById("create-panel");
let currentUser = null;

function say(text, error = false) {
  msg.textContent = text;
  msg.className = "message" + (error ? " error" : "");
}

function makeSlug() {
  return "galeri-" + crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function shareUrl(slug) {
  return new URL(
    `galeri.html?slug=${encodeURIComponent(slug)}`,
    location.href
  ).href;
}

async function downloadGalleryQR(g) {
  if (typeof QRCode === "undefined") {
    say("Generator QR belum berhasil dimuat. Periksa koneksi internet lalu coba lagi.", true);
    return;
  }

  const holder = el("div", "qr-download-render");
  holder.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1200px;height:1200px;background:#fff;padding:24px;";
  document.body.append(holder);

  try {
    new QRCode(holder, {
      text: shareUrl(g.slug),
      width: 1200,
      height: 1200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    await new Promise(resolve => setTimeout(resolve, 250));

    const canvas = holder.querySelector("canvas");

    if (canvas) {
      const link = document.createElement("a");
      link.download = `QR-FotoKu-${(g.nama_acara || "acara")
        .trim()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "acara"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else {
      const img = holder.querySelector("img");
      if (!img) throw new Error("Gambar QR tidak berhasil dibuat.");

      const canvasFallback = document.createElement("canvas");
      canvasFallback.width = 1200;
      canvasFallback.height = 1200;

      const context = canvasFallback.getContext("2d");

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        if (img.complete) resolve();
      });

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 1200, 1200);
      context.drawImage(img, 0, 0, 1200, 1200);

      const link = document.createElement("a");
      link.download = `QR-FotoKu-${(g.nama_acara || "acara")
        .trim()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "acara"}.png`;
      link.href = canvasFallback.toDataURL("image/png");
      link.click();
    }

    say("QR Code berhasil dibuat. Pindai hasil unduhan untuk memastikan tautannya benar.");
  } catch (error) {
    say(`QR Code gagal diunduh: ${error.message || error}`, true);
  } finally {
    holder.remove();
  }
}

async function init() {
  const { data, error } = await db.auth.getUser();

  if (error || !data.user) {
    location.href = "login.html";
    return;
  }

  currentUser = data.user;
  document.getElementById("user-email").textContent = currentUser.email || "";

  await loadGalleries();
  await loadAnalytics();
}

async function loadGalleries() {
  list.replaceChildren(el("div", "empty-state", "Memuat galeri…"));

  const { data, error } = await db
    .from("galeri_acara")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.replaceChildren(
      el("div", "empty-state error", `Gagal memuat galeri: ${error.message}`)
    );
    return;
  }

  list.replaceChildren();

  if (!data.length) {
    list.append(
      el("div", "empty-state", "Belum ada galeri. Tekan “Buat Galeri” untuk memulai.")
    );
    return;
  }

  for (const g of data) {
    const card = el("article", "gallery-admin-card");
    const head = el("div", "gallery-admin-head");
    const info = el("div", "");

    info.append(
      el("h2", "", g.nama_acara),
      el("p", "muted tiny", g.tanggal_acara || "Tanggal belum diisi")
    );

    head.append(
      info,
      el(
        "span",
        `status-pill ${g.is_published ? "published" : ""}`,
        g.is_published ? "Dipublikasikan" : "Draf"
      )
    );

    card.append(head);

    if (g.deskripsi) {
      card.append(el("p", "muted", g.deskripsi));
    }

    const actions = el("div", "card-actions");

    const open = el("a", "btn btn-small", "Buka Galeri ↗");
    open.href = shareUrl(g.slug);
    open.target = "_blank";
    open.rel = "noopener";

    const copy = el("button", "btn btn-ghost btn-small", "Salin Tautan");
    copy.type = "button";
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl(g.slug));
        say("Tautan galeri disalin.");
      } catch {
        prompt("Salin tautan ini:", shareUrl(g.slug));
      }
    };

    const qr = el("button", "btn btn-ghost btn-small", "Unduh QR PNG");
    qr.type = "button";
    qr.onclick = () => downloadGalleryQR(g);

    const toggle = el(
      "button",
      "btn btn-ghost btn-small",
      g.is_published ? "Jadikan Draf" : "Publikasikan"
    );
    toggle.type = "button";
    toggle.onclick = () => togglePublish(g);

    const upload = el("button", "btn btn-ghost btn-small", "Kelola Foto");
    upload.type = "button";
    upload.onclick = () => showPhotoManager(g);

    const remove = el("button", "btn btn-danger btn-small", "Hapus");
    remove.type = "button";
    remove.onclick = () => deleteGallery(g);

    actions.append(open, copy, qr, upload, toggle, remove);
    card.append(actions);
    list.append(card);
  }
}

async function loadAnalytics() {
  const summary = document.getElementById("analytics-summary");
  const details = document.getElementById("analytics-details");

  try {
    const { data: galleries, error: galleryError } = await db
      .from("galeri_acara")
      .select("id,nama_acara,is_published")
      .eq("user_id", currentUser.id);

    if (galleryError) throw galleryError;

    const ids = (galleries || []).map(g => g.id);
    let events = [];
    let photoCount = 0;

    if (ids.length) {
      const { data: eventData, error: eventError } = await db
        .from("gallery_analytics")
        .select("gallery_id,event_type,created_at")
        .in("gallery_id", ids);

      if (eventError) throw eventError;

      events = eventData || [];

      const { count, error: photoError } = await db
        .from("photos")
        .select("id", { count: "exact", head: true })
        .in("gallery_id", ids);

      if (photoError) throw photoError;
      photoCount = count || 0;
    }

    const views = events.filter(e => e.event_type === "view").length;
    const downloads = events.filter(e => e.event_type === "download").length;

    summary.replaceChildren();

    for (const [label, value] of [
      ["Total pengunjung", views],
      ["Unduhan foto", downloads],
      ["Galeri aktif", (galleries || []).filter(g => g.is_published).length],
      ["Total foto", photoCount]
    ]) {
      const card = el("div", "analytics-stat");
      card.append(el("span", "", label), el("strong", "", String(value)));
      summary.append(card);
    }

    details.replaceChildren();

    if (!galleries?.length) {
      details.textContent = "Buat galeri untuk mulai melihat statistik.";
      return;
    }

    details.append(el("p", "", "Aktivitas per galeri:"));

    for (const g of galleries) {
      const ownEvents = events.filter(e => e.gallery_id === g.id);
      const row = el("div", "analytics-gallery-row");

      row.append(
        el("span", "", g.nama_acara),
        el(
          "span",
          "",
          `${ownEvents.filter(e => e.event_type === "view").length} kunjungan · ${ownEvents.filter(e => e.event_type === "download").length} unduhan`
        )
      );

      details.append(row);
    }

    details.append(
      el(
        "p",
        "muted tiny",
        "Catatan: statistik hanya mulai tercatat setelah tabel gallery_analytics dibuat dan galeri dibuka atau foto diunduh."
      )
    );
  } catch (err) {
    summary.replaceChildren();
    details.textContent =
      "Statistik belum aktif. Jalankan bagian FITUR STATISTIK pada supabase-setup.sql di Supabase SQL Editor, lalu muat ulang dashboard. Pesan: " +
      (err.message || err);
  }
}

document.getElementById("new-gallery").onclick = () => {
  panel.classList.remove("hidden");
  document.getElementById("event-name").focus();
};

document.getElementById("cancel-create").onclick = () => {
  panel.classList.add("hidden");
};

document.getElementById("gallery-form").addEventListener("submit", async e => {
  e.preventDefault();

  const name = document.getElementById("event-name").value.trim();
  if (!name) return;

  const payload = {
    user_id: currentUser.id,
    nama_acara: name,
    slug: makeSlug(),
    tanggal_acara: document.getElementById("event-date").value || null,
    deskripsi: document.getElementById("event-description").value.trim(),
    is_published: false
  };

  const { error } = await db.from("galeri_acara").insert(payload);

  if (error) {
    say(`Galeri gagal dibuat: ${error.message}`, true);
    return;
  }

  e.target.reset();
  panel.classList.add("hidden");
  say("Galeri berhasil dibuat.");
  await loadGalleries();
});

async function togglePublish(g) {
  const { error } = await db
    .from("galeri_acara")
    .update({ is_published: !g.is_published })
    .eq("id", g.id)
    .eq("user_id", currentUser.id);

  if (error) {
    say(`Status gagal diubah: ${error.message}`, true);
    return;
  }

  say("Status publikasi diperbarui.");
  await loadGalleries();
}

async function deleteGallery(g) {
  if (!confirm(`Hapus galeri "${g.nama_acara}" beserta daftar fotonya? Tindakan ini tidak dapat dibatalkan.`)) {
    return;
  }

  const { data: photos } = await db
    .from("photos")
    .select("storage_path")
    .eq("gallery_id", g.id);

  if (photos?.length) {
    const paths = photos.map(p => p.storage_path);
    const { error: storageError } = await db.storage
      .from(cfg.STORAGE_BUCKET)
      .remove(paths);

    if (storageError) {
      say(`File foto belum berhasil dihapus dari Storage: ${storageError.message}. Galeri tidak dihapus.`, true);
      return;
    }
  }

  const { error } = await db
    .from("galeri_acara")
    .delete()
    .eq("id", g.id)
    .eq("user_id", currentUser.id);

  if (error) {
    say(`Galeri gagal dihapus: ${error.message}`, true);
    return;
  }

  say("Galeri dihapus.");
  await loadGalleries();
}

async function showPhotoManager(g) {
  const overlay = el("div", "photo-manager-overlay");
  const modal = el("section", "photo-manager panel");
  const top = el("div", "photo-manager-head");

  top.append(el("div", "", ""));
  top.firstChild.append(
    el("h2", "", `Kelola Foto — ${g.nama_acara}`),
    el("p", "muted tiny", "Foto yang dihapus tidak dapat dipulihkan.")
  );

  const close = el("button", "btn btn-ghost btn-small", "Tutup");
  close.type = "button";
  close.onclick = () => overlay.remove();
  top.append(close);

  const status = el("p", "message", "");
  const uploadBtn = el("button", "btn btn-small", "＋ Upload Foto");
  uploadBtn.type = "button";
  const grid = el("div", "photo-manager-grid");

  modal.append(top, status, uploadBtn, grid);
  overlay.append(modal);
  document.body.append(overlay);

  async function loadPhotos() {
    grid.replaceChildren(el("div", "empty-state", "Memuat foto…"));

    const { data, error } = await db
      .from("photos")
      .select("id,storage_path,file_name,created_at")
      .eq("gallery_id", g.id)
      .order("created_at", { ascending: false });

    if (error) {
      grid.replaceChildren(
        el("div", "empty-state error", `Foto gagal dimuat: ${error.message}`)
      );
      return;
    }

    grid.replaceChildren();

    if (!data?.length) {
      grid.append(el("div", "empty-state", "Belum ada foto di galeri ini."));
      return;
    }

    for (const photo of data) {
      const card = el("article", "photo-manager-card");
      const fileName = el("p", "photo-manager-name", photo.file_name || "Foto");

      const { data: signed } = await db.storage
        .from(cfg.STORAGE_BUCKET)
        .createSignedUrl(photo.storage_path, 600);

      if (signed?.signedUrl) {
        const img = el("img", "photo-manager-thumb");
        img.src = signed.signedUrl;
        img.alt = photo.file_name || "Foto galeri";
        img.loading = "lazy";
        card.append(img);
      } else {
        card.append(
          el("div", "photo-manager-thumb photo-manager-placeholder", "Pratinjau tidak tersedia")
        );
      }

      const remove = el("button", "btn btn-danger btn-small", "Hapus Foto");
      remove.type = "button";

      remove.onclick = async () => {
        if (!confirm(`Hapus foto "${photo.file_name}"? Tindakan ini tidak dapat dibatalkan.`)) {
          return;
        }

        remove.disabled = true;
        remove.textContent = "Menghapus…";

        const { error: storageError } = await db.storage
          .from(cfg.STORAGE_BUCKET)
          .remove([photo.storage_path]);

        if (storageError) {
          status.textContent = `File gagal dihapus: ${storageError.message}`;
          status.className = "message error";
          remove.disabled = false;
          remove.textContent = "Hapus Foto";
          return;
        }

        const { error: rowError } = await db
          .from("photos")
          .delete()
          .eq("id", photo.id)
          .eq("gallery_id", g.id);

        if (rowError) {
          status.textContent =
            `File sudah dihapus dari Storage, tetapi catatan database gagal dihapus: ${rowError.message}. Hubungi pengelola database untuk pemeriksaan.`;
          status.className = "message error";
          await loadPhotos();
          return;
        }

        status.textContent = "Foto berhasil dihapus.";
        status.className = "message";
        await loadPhotos();
      };

      card.append(fileName, remove);
      grid.append(card);
    }
  }

  uploadBtn.onclick = async () => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/*";
    picker.multiple = true;

    picker.onchange = async () => {
      const selected = [...picker.files];
      if (!selected.length) return;

      const total = selected.length;
      let ok = 0;
      const failures = [];

      const progressWrap = el("div", "upload-progress-wrap");
      const progressLabel = el("p", "muted tiny", `Menyiapkan ${total} foto…`);
      const progress = document.createElement("progress");

      progress.max = total;
      progress.value = 0;
      progress.setAttribute("aria-label", "Progres unggah foto");
      progress.style.cssText =
        "display:block;width:100%;height:14px;margin:8px 0 12px;";

      progressWrap.append(progressLabel, progress);
      status.replaceChildren();
      status.append(progressWrap);
      status.className = "message";

      uploadBtn.disabled = true;
      uploadBtn.textContent = "Mengunggah…";

      try {
        for (let i = 0; i < total; i++) {
          const file = selected[i];

          progressLabel.textContent =
            `Memproses foto ${i + 1} dari ${total}: ${file.name}`;

          if (!file.type.startsWith("image/")) {
            failures.push(`${file.name}: bukan file gambar`);
            progress.value = i + 1;
            continue;
          }

          if (file.size > 10 * 1024 * 1024) {
            failures.push(`${file.name}: melebihi 10 MB`);
            progress.value = i + 1;
            continue;
          }

          const ext = (file.name.split(".").pop() || "jpg")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") || "jpg";

          const path = `${currentUser.id}/${g.id}/${crypto.randomUUID()}.${ext}`;

          const { error: upError } = await db.storage
            .from(cfg.STORAGE_BUCKET)
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type
            });

          if (upError) {
            failures.push(`${file.name}: ${upError.message}`);
            progress.value = i + 1;
            continue;
          }

          const { error: dbError } = await db.from("photos").insert({
            gallery_id: g.id,
            storage_path: path,
            file_name: file.name
          });

          if (dbError) {
            await db.storage.from(cfg.STORAGE_BUCKET).remove([path]);
            failures.push(`${file.name}: ${dbError.message}`);
            progress.value = i + 1;
            continue;
          }

          ok++;
          progress.value = i + 1;
        }

        progressLabel.textContent =
          `Selesai: ${ok} dari ${total} foto berhasil diunggah.`;

        status.append(
          el(
            "div",
            failures.length ? "error" : "",
            failures.length
              ? `${ok} foto berhasil. ${failures.length} gagal: ${failures.join(" | ")}`
              : `${ok} foto berhasil diunggah.`
          )
        );

        status.className = failures.length ? "message error" : "message";
      } catch (error) {
        progressLabel.textContent = "Proses unggah terhenti.";
        status.append(
          el("div", "error", `Terjadi kesalahan: ${error.message || error}`)
        );
        status.className = "message error";
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "＋ Upload Foto";
        await loadPhotos();
      }
    };

    picker.click();
  };

  await loadPhotos();
}

document.getElementById("logout").onclick = async () => {
  await db.auth.signOut();
  location.href = "index.html";
};

init();
