# 62. Implementasi Logika Markup Harga Hierarkis (+Rp1.000)

Sesi ini berfokus pada sinkronisasi dan refaktor logika biaya tambahan (markup) Rp1.000 agar lebih fleksibel, konsisten di seluruh platform, dan mendukung pengaturan per-menu yang mengesampingkan pengaturan per-kedai.

## Perubahan Basis Data

1.  **Tabel `products`**:
    - Mengubah kolom `markup_enabled` menjadi *nullable boolean* dengan default `NULL`.
    - Mengatur ulang semua data `markup_enabled` yang ada menjadi `NULL` untuk mendukung pewarisan (*inheritance*) dari pengaturan kedai.
2.  **Tabel `order_items`**:
    - Menambahkan kolom `markup_amount` (int4) untuk mencatat biaya markup yang dikenakan pada setiap item saat transaksi terjadi (untuk keperluan transparansi audit).
3.  **Fungsi RPC `create_order`**:
    - Memperbarui fungsi untuk menerima parameter `markup_amount` di dalam list item pesanan dan menyimpannya ke tabel `order_items`.

## Perubahan Kode (Frontend & Logic)

### 1. Konteks & Tipe Data
- **`database.types.ts`**: Meregenerasi tipe data untuk menyertakan kolom `markup_amount` dan perubahan skema `markup_enabled`.
- **`DataContext.tsx`**: 
    - Memperbarui interface `Product`, `Outlet`, dan `OrderItem`.
    - Memperbarui pemetaan data pada fungsi `addOrder` (RPC mapping) untuk menyertakan `markup_amount`.
- **`CartContext.tsx`**: Menambahkan properti `markupAmount` ke dalam tipe `CartItem`.

### 2. Logika Penentuan Harga (Hierarki)
Mengimplementasikan logika baru di mana sistem mengecek status markup dengan urutan:
1.  **Produk**: Jika disetel spesifik (*Always ON* atau *Always OFF*).
2.  **Outlet**: Jika produk disetel "Ikuti Kedai" (NULL), maka merujuk ke pengaturan outlet.
3.  **Default**: Aktif (jika outlet pun tidak disetel).

Berlaku di komponen:
- `StoreDetail.tsx`
- `Home.tsx`
- `QuickAddButton.tsx`
- `ManualOrderCreation.tsx`

### 3. Antarmuka Manajemen (Admin)
- **`AdminPanel.tsx`**: Menambahkan toggle "Tambah +Rp1.000 (Semua Menu)" pada modal edit/tambah outlet.
- **`OutletMenuManagement.tsx`**: Mengganti toggle markup lama dengan 3 pilihan state: **Ikuti Kedai (Inherit)**, **Selalu Aktif**, dan **Nonaktif**.

### 4. Transaksi & Laporan
- **`Checkout.tsx`**: Mengubah kalkulasi `service_fee` komunal menjadi akumulasi dari properti `markupAmount` masing-masing item di keranjang.
- **`InvoiceModal.tsx`**: Memperbarui struk outlet agar harga item otomatis dikurangi nilai markup yang tersimpan, memastikan subtotal outlet akurat.
- **`ManualOrderCreation.tsx`**: Memperbarui alat pemesanan manual admin agar menghitung `service_fee` berdasarkan markup riil per item.

## Verifikasi Sistem
- ✅ **Typecheck**: `npm run typecheck` berhasil tanpa error.
- ✅ **Lint**: `npm run lint` berhasil.
- ✅ **Build**: `npm run build` berhasil (bundel produksi tercipta sempurna).
