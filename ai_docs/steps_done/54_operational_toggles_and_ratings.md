# Step 54 — Operational Toggles & Customer Ratings

**Tanggal:** 11 April 2026  
**Scope:** Toggle Buka/Tutup Layanan, Kontrol Area (Desa), Rating Driver & Makanan  
**Build:** ✅ TypeScript 0 errors | Vite build SUCCESS  

---

## Ringkasan Perubahan

Sesi ini menambahkan fitur kontrol operasional tingkat lanjut bagi admin dan sistem umpan balik (rating) bagi pelanggan.

### 1. Database & Infrastruktur
- **Tabel `app_settings`**: Menyimpan konfigurasi global seperti status layanan (`is_service_open`), pesan tutup, dan daftar desa nonaktif.
- **Tabel `order_ratings`**: Menyimpan penilaian bintang (1-5) dan komentar dari pelanggan untuk driver dan outlet.
- **Realtime Sync**: Mengaktifkan sinkronisasi otomatis untuk `app_settings` sehingga perubahan status layanan langsung berdampak pada seluruh aplikasi tanpa refresh.

### 2. Fitur Admin (Control Panel)
- **Toggle Layanan Global**: Admin dapat menutup seluruh layanan. Pelanggan otomatis diarahkan ke halaman khusus "Layanan Sedang Tutup".
- **Toggle Area (Desa)**: Admin dapat menonaktifkan desa tertentu (misal karena cuaca buruk/kurang driver). Desa yang dinonaktifkan akan tampil sebagai "(Tidak Tersedia)" dan tidak bisa dipilih di form checkout.
- **Monitoring Driver**: Admin dapat melihat rata-rata rating, jumlah ulasan, dan membaca komentar pelanggan secara mendalam melalui modal "Lihat Ulasan" di menu Manajemen Driver.

### 3. Fitur Pelanggan (Feedback Loop)
- **Rating Popup**: Setelah pesanan berstatus `Selesai`, popup penilaian otomatis akan muncul di halaman pelacakan.
- **Rating Fallback**: Menambahkan tombol "Beri Penilaian" di Riwayat Pesanan untuk pesanan yang belum sempat dinilai.
- **UI/UX**: Menggunakan sistem rating 5 bintang untuk Driver (Pelayanan) dan Outlet (Kualitas Makanan) disertai kolom komentar opsional.

---

## Teknis (File yang Diubah)

- **Database**: Migrasi pembuatan `app_settings` dan `order_ratings`.
- **`DataContext.tsx`**: Implementasi state global settings dan ratings, serta fungsi CRUD pendukung.
- **`AdminPanel.tsx`**: Penambahan tab "Pengaturan" untuk kontrol operasional.
- **`DriverManagement.tsx`**: Penambahan statistik rating dan modal ulasan.
- **`Checkout.tsx` & `KirimBarang.tsx`**: Logic disable desa berdasarkan setting admin.
- **`OrderTracking.tsx` & `History.tsx`**: Integrasi popup rating dan tombol ulasan.
- **`ServiceClosed.tsx`**: Halaman landing baru ketika layanan ditutup.

---

*Generated: 11 April 2026 — Step 54 Documentation*
