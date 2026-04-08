# Dokumentasi Langkah Kerja: Implementasi Detail Item Pesanan

**Nomor Folder:** 15
**Tanggal:** 2026-04-08
**Deskripsi:** Menambahkan visibilitas detail item pesanan (gambar, nama, qty, harga, subtotal) di seluruh antarmuka (Admin, Driver, Customer) dan pada struk invoice.

## 1. Perubahan pada Data Layer

### `src/app/contexts/DataContext.tsx`
- Menambahkan tipe data `OrderItemWithProduct`.
- Menambahkan state `orderItemsCache` untuk menyimpan data item yang sudah di-fetch.
- Menambahkan fungsi `fetchOrderItems(orderId)` yang melakukan join query ke tabel `products` untuk mengambil `image_url`.
- Meng-expose data dan fungsi tersebut melalui context.

## 2. Pembuatan Komponen Baru

### `src/app/components/OrderItemsDetail.tsx`
- Membuat komponen baru yang dapat menampilkan daftar item pesanan.
- Mendukung mode **`inline`** (tampilan tertanam langsung) dan mode **`modal`** (tampilan popup).
- Menampilkan gambar produk, nama, varian, ekstra, kuantitas, harga satuan, dan subtotal per item.

## 3. Integrasi pada Panel Admin

### `src/app/pages/admin/AdminPanel.tsx`
- Menambahkan tombol **"Lihat Pesanan"** pada setiap kartu pesanan di daftar order.
- Menghubungkan tombol tersebut dengan modal `OrderItemsDetail` untuk memberikan preview cepat kepada admin sebelum assign driver.

## 4. Integrasi pada Panel Driver

### `src/app/pages/driver/DriverPanel.tsx`
- Menambahkan tombol **"Lihat Pesanan"** pada kartu pesanan yang tersedia.
- Menambahkan tombol **"Lihat Detail Pesanan"** pada tampilan pesanan aktif.
- Memungkinkan driver untuk melakukan verifikasi barang secara visual (melihat gambar) saat berada di toko.

## 5. Integrasi pada Sisi Customer (Pelanggan)

### `src/app/pages/customer/OrderTracking.tsx`
- Menampilkan rincian item secara **inline** di bagian bawah status pelacakan.
- Memberikan transparansi kepada pelanggan tentang isi pesanan mereka saat sedang diproses atau diantar.

### `src/app/pages/customer/History.tsx`
- Menambahkan tombol **"Detail"** pada setiap riwayat pesanan.
- Mengubah layout tombol dari 2 kolom menjadi 3 kolom untuk menampung akses cepat ke rincian item.

## 6. Perbaikan Tampilan Invoice

### `src/app/components/OrderItemsDetail.tsx` (Logic) & `src/app/components/InvoiceModal.tsx`
- Memodifikasi `InvoiceModal` untuk melakukan fetch data item secara otomatis saat struk dibuka.
- Menambahkan rincian item (Nama, Qty, Harga, Subtotal) ke dalam layout struk thermal.
- Menambahkan informasi total kuantitas item dalam satu pesanan.

## 7. Verifikasi dan Pengujian
- Melakukan pemeriksaan tipe data dengan `npx tsc --noEmit` (0 Error).
- Berhasil melakukan build produksi dengan `npx vite build`.
- Melakukan testing browser otomatis menggunakan browser subagent untuk memvalidasi alur kerja di ketiga panel (Admin, Driver, Customer) dan memastikan data muncul sesuai ekspektasi.
