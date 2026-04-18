# 68. Revisi Sistem Ongkir & Penambahan Tracking Lokasi Customer

## Deskripsi Pekerjaan
Pekerjaan ini mencakup penyesuaian pada sistem perhitungan ongkos kirim (ongkir) agar sepenuhnya berbasis GPS (jarak aktual) dan menghapus ketergantungan pada tabel pengaturan desa (`distance_matrix`). Selain itu, dilakukan peningkatan pada detail informasi lokasi pelanggan di Admin Panel dan Driver Panel untuk mempermudah navigasi.

## Perubahan Utama

### 1. Penghapusan Ongkir Berbasis Desa (Strict GPS)
- **Logika Perhitungan:** Memodifikasi `calculateOrderFinance` di `src/app/utils/financeCalculations.ts` untuk menghapus fallback ke `distance_matrix`. Kini ongkir murni dihitung berdasarkan `jarak aktual * tarif per km` (+ biaya zona jika ada).
- **Pembersihan Context:** Menghapus state `distanceMatrix` serta fungsi `getDistance` dan `getDeliveryFee` dari `src/app/contexts/DataContext.tsx`.
- **Pengaturan Admin:** Menghapus UI "Ongkos Kirim Antar Desa" dari `src/app/pages/admin/Settings.tsx`.
- **Database:** Melakukan migrasi untuk menghapus tabel `public.distance_matrix` yang tidak lagi digunakan.

### 2. Informasi Desa pada Form Pelanggan
- **Checkout & Kirim Barang:** Mengembalikan pilihan dropdown Desa pada `Checkout.tsx` dan `KirimBarang.tsx`. Data desa kini bersifat **informasi tambahan** (metadata) untuk admin/driver dan tidak mempengaruhi perhitungan ongkir.
- **Daftar Desa Tunggal:** Menyeragamkan konstanta `VILLAGE_GROUPS` menjadi daftar flat di seluruh komponen (`AdminPanel.tsx`, `ManualOrderCreation.tsx`, dsb) untuk konsistensi.

### 3. Peningkatan Detail Lokasi di Admin & Driver Panel
- **Admin Panel:**
  - Menampilkan alamat lengkap beserta patokan secara lebih jelas.
  - Menampilkan koordinat Latitude & Longitude pelanggan.
  - Menambahkan tombol **"Buka Maps"** yang langsung mengarah ke lokasi pelanggan di Google Maps.
- **Driver Panel:**
  - Menambahkan tombol aksi cepat **"Maps Kedai"** dan **"Maps Customer"** pada daftar order tersedia maupun order aktif.
  - Driver kini dapat langsung melakukan navigasi ke outlet atau ke rumah pelanggan dengan satu klik.

### 4. Pesanan Manual (Admin)
- **Manual Jarak:** Pada komponen `ManualOrderCreation.tsx`, admin kini dapat menginput jarak pengantaran secara manual (dalam KM) untuk menghitung ongkir saat membuat pesanan titipan/manual, menggantikan sistem lookup desa sebelumnya.

## File yang Dimodifikasi
- `src/app/utils/financeCalculations.ts`
- `src/app/contexts/DataContext.tsx`
- `src/app/pages/admin/Settings.tsx`
- `src/app/pages/admin/AdminPanel.tsx`
- `src/app/pages/driver/DriverPanel.tsx`
- `src/app/pages/customer/Checkout.tsx`
- `src/app/pages/customer/KirimBarang.tsx`
- `src/app/components/ManualOrderCreation.tsx`

## Verifikasi
- ✅ **Build Check:** `npm run build` berhasil tanpa error (7.13s).
- ✅ **Database:** Tabel `distance_matrix` telah dihapus.
- ✅ **Logic Check:** Perhitungan ongkir dipastikan menggunakan `distance * cost_per_km` + `zoneFee`.
- ✅ **UI Check:** Semua dropdown desa telah diperbarui dan tombol Maps telah terintegrasi di Admin & Driver panel.