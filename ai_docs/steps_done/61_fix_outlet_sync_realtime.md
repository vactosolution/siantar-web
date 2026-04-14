# Dokumentasi Perbaikan Sinkronisasi Status Outlet (#63)

Dokumen ini mencatat langkah-langkah yang telah dilakukan untuk menyelesaikan masalah sinkronisasi status Buka/Tutup outlet antara Admin Panel dan Customer Panel secara realtime dan aman.

## 1. Konfigurasi Database & Realtime
- **Aktivasi Realtime:** Menambahkan tabel `outlets`, `products`, dan `profiles` ke dalam publikasi `supabase_realtime` di database PostgreSQL Supabase.
- **Keamanan Waktu:** Membuat fungsi RPC `get_server_time()` di database untuk mengambil waktu *timestamp with time zone* yang akurat langsung dari server (mencegah kecurangan jam di sisi klien).

## 2. Inisialisasi Logic & Context (`DataContext.tsx`)
- **Refaktor Subscription:** Mengubah penanganan event `UPDATE`, `INSERT`, dan `DELETE` untuk tabel `outlets` dan `orders` agar melakukan mutasi state lokal (*incremental update*) alih-alih melakukan *fetch* ulang seluruh data (`SELECT *`). Hal ini dilakukan untuk mencegah kelebihan beban database (*Thundering Herd*).
- **Logika Quick Toggle:** Memperbarui fungsi `toggleOutletOpen` agar secara otomatis menyetel `is_manual_schedule: true` saat status diubah secara manual oleh Admin, memastikan status tersebut menjadi prioritas utama.

## 3. Validasi Keamanan Checkout (`Checkout.tsx`)
- **Validasi Berlapis:** Menambahkan pengecekan status outlet dan waktu server sesaat sebelum pesanan dibuat (`handleOrder`). Sistem kini mengambil data terbaru dari database dan membandingkannya dengan waktu server asli (WITA) sebelum mengizinkan pemesanan.

## 4. Pembaruan UI & Konsistensi
- **Admin Panel:** Memperbarui tampilan daftar outlet di Admin Panel agar menggunakan fungsi `isOutletCurrentlyOpen` yang sama dengan sisi Customer, menjamin konsistensi status yang ditampilkan.
- **UX Warning:** Menambahkan notifikasi *toast* untuk Admin saat tombol Buka/Tutup cepat ditekan, memperingatkan bahwa "Mode Manual" sedang aktif dan jadwal otomatis tidak akan berlaku hingga dinonaktifkan kembali.

## 5. Penyesuaian Zona Waktu (WITA)
- **Migrasi Timezone:** Mengubah seluruh logika perhitungan jadwal di `src/app/utils/scheduleUtils.ts` dari `Asia/Jakarta` (WIB) ke **`Asia/Makassar` (WITA)** sesuai dengan lokasi operasional toko di Kalimantan.

## 6. Verifikasi & Kualitas Kode
- **Type Safety:** Memperbarui `src/lib/database.types.ts` untuk menyertakan definisi tipe RPC `get_server_time`.
- **Quality Control:** Menjalankan rangkaian perintah verifikasi:
    - `npm run typecheck`: **Lulus** (Type safe).
    - `npm run lint`: **Lulus** (Kode bersih).
    - `npm run build`: **Lulus** (Aplikasi siap deploy).

---
**Status Akhir:** Masalah #63 Selesai dan Aman.
