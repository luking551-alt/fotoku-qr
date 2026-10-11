# FotoKu QR — Paket Proyek

Paket ini adalah versi proyek mandiri yang memakai Supabase proyek FotoKu QR yang telah dikonfigurasi dalam `config.js`. Berkas ini belum otomatis mengganti atau men-deploy proyek yang ada di GitHub/Vercel/Supabase.

## Isi paket
- `index.html`: halaman depan
- `login.html` + `auth.js`: login dan pendaftaran Supabase Auth
- `dashboard.html` + `dashboard.js`: buat/publikasikan/hapus galeri, unggah foto, tautan, QR
- `galeri.html` + `galeri.js`: galeri publik dan unduh foto asli
- `style.css`: tampilan responsif
- `config.js`: URL proyek dan publishable key
- `supabase-setup.sql`: contoh skema dan kebijakan RLS/Storage
- `supabase/functions/galeri-publik/index.ts`: kode Edge Function publik

## Menjalankan secara lokal
1. Ekstrak ZIP ke folder baru. Jangan hapus proyek lama.
2. Buka folder dengan VS Code.
3. Jalankan `index.html` menggunakan ekstensi Live Server.
4. Masuk melalui `login.html` menggunakan akun Supabase yang sudah ada.
5. Buat galeri, unggah foto, publikasikan, lalu buka tautan galeri.

## Catatan integrasi penting
- `config.js` berisi publishable key, bukan service-role key. Jangan pernah menaruh service-role key di browser atau GitHub.
- Edge Function `galeri-publik` harus sudah ter-deploy dan memiliki secret `SUPABASE_SERVICE_ROLE_KEY` yang disimpan di pengaturan Supabase Function.
- Pastikan bucket `fotoku-photos` private, dengan batas 10 MB dan hanya gambar.
- Sebelum menjalankan `supabase-setup.sql`, bandingkan dengan skema/policies proyek yang sudah ada. SQL ini membuat policy bernama tertentu dan bisa memengaruhi akses; jangan jalankan tanpa backup.
- Jika bucket/tabel sudah memiliki policies, sesuaikan agar sesuai kebutuhan dan hindari duplikasi atau policy yang terlalu terbuka.
- Supabase publishable key dapat dipakai di browser, tetapi keamanan tetap bergantung pada RLS dan Storage policies yang benar.
- QR code dibuat melalui layanan QR pihak ketiga (QR Server); tautan galeri akan dikirim ke layanan tersebut saat QR dibuka.
- Fungsi publik hanya mengeluarkan signed URL untuk galeri yang `is_published = true`. Tautan foto berlaku 1 jam.
- Untuk unduh banyak foto, browser mungkin meminta izin unduhan berulang.
- Foto yang sumbernya sudah kecil/buram tidak dapat dipulihkan menjadi foto tajam hanya melalui CSS atau JavaScript. Gunakan sumber asli beresolusi tinggi.
- File galeri publik menampilkan foto dari URL sumber yang sama; thumbnail transformasi belum diaktifkan. Hal ini menghindari klaim palsu bahwa pratinjau sudah dioptimalkan.

## Deployment
Jangan langsung menimpa folder deploy atau mengubah konfigurasi hosting. Tes di folder terpisah, lalu unggah perubahan setelah memastikan login, unggah, publikasi, tautan, dan unduhan bekerja dengan policies proyek Anda.


## Fitur hapus foto di dashboard
Buka Dashboard, pilih **Kelola Foto** pada galeri acara. Daftar foto akan ditampilkan; tekan **Hapus Foto** pada foto yang ingin dihapus lalu konfirmasi. Penghapusan membutuhkan kebijakan RLS tabel `photos` dan kebijakan DELETE pada `storage.objects` yang membatasi pengguna pada file miliknya. Uji dahulu dengan satu foto percobaan. Perubahan kode ini belum otomatis ter-deploy ke Vercel.


## Hubungi admin via WhatsApp

Tombol laporan masalah ditambahkan pada Dashboard dan halaman galeri publik. Tombol membuka WhatsApp ke nomor admin yang dikonfigurasi, dengan teks laporan awal yang dapat diedit sebelum dikirim. Nomor disimpan dalam format internasional Indonesia: `6285166222758`. Pesan tidak terkirim otomatis; pengguna tetap meninjau dan menekan Kirim di WhatsApp.


## Fitur unduh foto HD
- Pada halaman galeri publik, klik **Unduh Foto HD** di bawah foto untuk mengunduh file sumber asli yang disimpan di Supabase Storage.
- Klik **Unduh Semua Foto HD** untuk meminta unduhan setiap foto satu per satu. Browser mungkin meminta izin untuk beberapa unduhan.
- Kualitas hasil unduhan mengikuti file yang diunggah. Jika foto sumber beresolusi rendah, tombol ini tidak dapat menciptakan detail baru; unggah file HD yang sudah ditingkatkan kualitasnya.
- Perubahan ini masih perlu diuji secara lokal dan belum di-deploy ke website online.


## Mengaktifkan statistik pengunjung dan unduhan
1. Buka Supabase Dashboard → SQL Editor.
2. Dari `supabase-setup.sql`, salin hanya bagian mulai dari komentar `FITUR STATISTIK PENGUNJUNG & UNDUHAN` sampai akhir, lalu jalankan. Jangan menjalankan ulang seluruh file jika proyek sudah aktif tanpa memeriksa SQL-nya.
3. Buka galeri yang sudah dipublikasikan dari situs lokal, lalu unduh foto untuk membuat aktivitas contoh.
4. Kembali ke dashboard dan muat ulang untuk melihat statistik.

Statistik mencatat jumlah pembukaan galeri dan klik unduhan foto, bukan identitas pengunjung unik. Fitur ini belum dideploy.
