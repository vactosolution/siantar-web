# 65. Perbaikan UI Search Bar (Contrast & Visibility)

## Deskripsi Pekerjaan
Pekerjaan ini mencakup perbaikan visual pada search bar di halaman beranda customer untuk mengatasi masalah teks dan placeholder yang terlalu samar pada background gelap. Fokus utama adalah meningkatkan kontras agar fitur pencarian mudah digunakan pada perangkat mobile.

## Perubahan Utama

### 1. Peningkatan Kontras Warna
- **Warna Teks:** Mengubah warna input text dari `text-gray-900` menjadi `text-white`.
- **Placeholder:** Mengubah warna placeholder dari `text-gray-500` menjadi `text-white/60` (putih dengan opasitas) untuk keterbacaan yang lebih baik di atas background gelap.
- **Ikon:** Mengubah warna ikon pencarian (Lucide Search) menjadi `text-white`.

### 2. Styling Input & Background
- **Background:** Memberikan background tipis `bg-white/10` pada input agar terlihat memiliki kedalaman (*depth*) namun tetap harmonis dengan card navy.
- **Border:** Menambahkan border orange transparan `border-orange-500/30` sebagai aksen identitas brand.
- **Placeholder Text:** Memperbarui teks placeholder menjadi "Cari outlet, menu, atau kategori" sesuai instruksi.

### 3. State & Feedback Visual
- **Focus State:** 
    - Menambahkan `focus:ring-4 focus:ring-orange-500/20` untuk efek glow saat aktif.
    - Menghilangkan outline default dan menggantinya dengan `focus:border-orange-500`.
    - Memberikan perpindahan background ke `focus:bg-white/15` untuk feedback interaksi.
- **Cursor:** Mengatur warna cursor menjadi putih dengan `caret-white`.

### 4. Optimalisasi Mobile
- Menyesuaikan ukuran font dengan `text-sm sm:text-base` agar tetap proporsional di layar kecil namun tetap mudah dibaca.
- Menambahkan transisi halus (`transition-all`) untuk semua perubahan state.

## Verifikasi
- ✅ **Warna:** Teks putih terlihat kontras di atas hero card gelap.
- ✅ **Fungsionalitas:** Fitur pencarian tetap berfungsi normal.
- ✅ **Visual:** Search bar terlihat lebih premium dan "clickable".

## File yang Dimodifikasi
- `src/app/pages/customer/Home.tsx`
