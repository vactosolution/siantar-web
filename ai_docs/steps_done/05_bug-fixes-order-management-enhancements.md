# 05 - Bug Fixes, Order Management, dan Checkout Enhancements

**Tanggal:** 2026-04-03
**Scope:** Perbaikan bug kritis, penambahan fitur manajemen order, validasi checkout, dan perbaikan settings

---

## Perubahan yang Dilakukan

### 1. Fix: Hapus Driver Gagal (FK Constraint)
**Masalah:** Tombol hapus driver tidak berfungsi karena FK constraint dari `auth.users` ke `profiles`.

**Database:**
- Migration `20250408_create_delete_driver_rpc.sql` — fungsi RPC `delete_driver(p_driver_id UUID)` yang menghapus auth user (cascade ke profiles)
- Fungsi menggunakan `SECURITY DEFINER` untuk bypass RLS

**File:** `src/app/contexts/DataContext.tsx`
- `deleteDriver()` sekarang memanggil `supabase.rpc('delete_driver', ...)` alih-alih delete langsung dari tabel `profiles`

---

### 2. Fix: React Error #31 — Category Grid Render Objek
**Masalah:** Customer page error "Objects are not valid as a React child" karena `{cat}` merender objek kategori langsung.

**File:** `src/app/pages/customer/Home.tsx`
- `{cat}` → `{cat.icon}` (untuk emoji)
- `{cat}` → `{cat.label}` (untuk teks label)
- `key={cat}` → `key={cat.id}`
- `selectedCategory === cat` → `selectedCategory === cat.id`

---

### 3. Fix: Customer Logout Setelah Refresh Halaman
**Masalah:** Customer login pakai localStorage, tapi `AuthContext.checkSession()` hanya cek Supabase session. Setelah refresh, customer dianggap belum login.

**File:** `src/app/contexts/AuthContext.tsx`
- Cek localStorage (`sianter_customer_name` + `sianter_customer_phone`) **sebelum** cek Supabase session
- Jika data customer ada di localStorage, set role dan username langsung

---

### 4. Fix: Order Creation Gagal (RLS Policy Violation)
**Masalah:** Customer tidak punya Supabase auth session, jadi RLS policy di tabel `orders` menolak insert dengan error 401 Unauthorized.

**Database:**
- Migration `create_order_rpc` — fungsi RPC `create_order(...)` yang handle insert orders, order_items, dan order_status_history dalam satu transaction
- Fungsi menggunakan `SECURITY DEFINER` untuk bypass RLS
- Parameter `p_items` menggunakan JSONB array untuk kompatibilitas dengan Supabase JS client
- Migration `add_anon_select_policies_for_customers` — tambah policy SELECT untuk anon users di tabel `orders`, `order_items`, `order_status_history`

**File:** `src/app/contexts/DataContext.tsx`
- `addOrder()` sekarang memanggil `supabase.rpc('create_order', ...)` alih-alih insert langsung ke tabel

**File:** `src/lib/database.types.ts`
- Tambah type definition untuk fungsi `create_order`

---

### 5. Fix: Orders Tidak Muncul di Driver Panel Setelah Assign
**Masalah:** Admin assign driver ke order, tapi order tidak muncul di driver panel. Kemungkinan karena dua step terpisah (`assignDriver` + `updateOrder`) tidak trigger realtime subscription dengan benar.

**Database:**
- Migration `create_assign_driver_rpc` — fungsi RPC `assign_driver_to_order(...)` yang update order dan insert status history dalam satu transaction
- Set status ke `driver_assigned` secara konsisten

**File:** `src/app/contexts/DataContext.tsx`
- `assignDriver()` sekarang memanggil RPC `assign_driver_to_order` alih-alih update langsung

**File:** `src/lib/database.types.ts`
- Tambah type definition untuk fungsi `assign_driver_to_order`

---

### 6. Fix: Orders Tidak Muncul di Riwayat Customer
**Masalah:** RLS policy SELECT di tabel `orders` hanya mengizinkan authenticated users, sedangkan customer pakai localStorage auth (anon session).

**Database:**
- Migration `add_anon_select_policies_for_customers` — 4 policy baru:
  - `Orders are viewable by anonymous users` — SELECT untuk anon di tabel `orders`
  - `Order items are viewable by anonymous users` — SELECT untuk anon di tabel `order_items`
  - `Order history is viewable by anonymous users` — SELECT untuk anon di tabel `order_status_history`
  - `Anonymous users can add order history` — INSERT untuk anon di tabel `order_status_history`

---

### 7. Feature: Tolak dan Hapus Pesanan di Admin Panel
**Tujuan:** Admin bisa menolak atau menghapus pesanan yang masih pending.

**Database:**
- Migration `create_reject_and_delete_order_rpc` — 2 fungsi RPC baru:
  - `reject_order(p_order_id TEXT)` — set status `cancelled` + insert status history
  - `delete_order(p_order_id TEXT)` — hapus order + order_items + order_status_history + notifications

**File:** `src/app/contexts/DataContext.tsx`
- Tambah fungsi `rejectOrder(orderId)` dan `deleteOrder(orderId)`
- Tambah ke interface `DataContextType` dan Provider value

**File:** `src/app/pages/admin/AdminPanel.tsx`
- Tambah state: `showRejectOrderConfirm`, `showDeleteOrderConfirm`
- Tambah handler: `handleRejectOrder()`, `handleDeleteOrder()`
- Tambah tombol "Tolak Pesanan" (kuning) dan "Hapus Pesanan" (merah) di order card (hanya muncul untuk status `pending`)
- Tambah ConfirmDialog untuk konfirmasi sebelum aksi

**File:** `src/lib/database.types.ts`
- Tambah type definition untuk `reject_order` dan `delete_order`

---

### 8. Feature: Validasi Single Outlet Order
**Tujuan:** User tidak bisa menambahkan produk dari outlet berbeda ke keranjang yang sama.

**File:** `src/app/contexts/CartContext.tsx`
- Tambah validasi di `addItem()` — check jika cart tidak kosong dan outletId berbeda
- Throw error dengan message jelas jika user coba tambah dari outlet lain
- Message: `"Keranjang hanya boleh berisi produk dari satu outlet. Saat ini: 'X', mencoba menambahkan dari: 'Y'"`

**File:** `src/app/pages/customer/StoreDetail.tsx`
- Import `toast` dari sonner
- Wrap `addItem()` dalam try-catch untuk tangkap error dan tampilkan toast

**File:** `src/app/pages/customer/Checkout.tsx`
- Hapus validasi multi-outlet yang redundant (sudah di-handle di CartContext)
- Tambah variabel `isMultiOutlet` dan `orderOutlets` untuk handle edge case

---

### 9. Fix: Service Fee Tidak Bisa Di-update di Settings
**Masalah:** Nilai service fee (dan fee lainnya) tidak terupdate meskipun sudah disimpan.

**File:** `src/app/pages/admin/Settings.tsx`
- `handleSaveFees()` sekarang explicit parse value ke integer: `parseInt(String(value)) || 0`
- Tambah `updated_at` timestamp saat update
- Tambah error logging per key untuk debugging

---

## File yang Dibuat

| File | Deskripsi |
|------|-----------|
| `supabase/migrations/20250408_create_delete_driver_rpc.sql` | RPC function untuk hapus driver (cascade ke auth.users) |

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/app/contexts/AuthContext.tsx` | Cek localStorage customer sebelum Supabase session |
| `src/app/contexts/DataContext.tsx` | `deleteDriver`, `addOrder`, `assignDriver` pakai RPC; tambah `rejectOrder`, `deleteOrder` |
| `src/app/contexts/CartContext.tsx` | Validasi single outlet di `addItem()` |
| `src/app/pages/customer/Home.tsx` | Fix category grid render objek |
| `src/app/pages/customer/StoreDetail.tsx` | Try-catch `addItem()` + toast error |
| `src/app/pages/customer/Checkout.tsx` | Hapus validasi multi-outlet redundant |
| `src/app/pages/admin/AdminPanel.tsx` | Tambah fitur tolak & hapus pesanan |
| `src/app/pages/admin/Settings.tsx` | Fix service fee update dengan explicit parseInt |
| `src/lib/database.types.ts` | Tambah type definitions untuk RPC functions baru |

## Database Migration

| Migration | Query |
|-----------|-------|
| `20250408_create_delete_driver_rpc` | `CREATE FUNCTION delete_driver(p_driver_id UUID)` |
| `create_order_rpc` | `CREATE FUNCTION create_order(...)` — handle orders, order_items, status_history |
| `create_assign_driver_rpc` | `CREATE FUNCTION assign_driver_to_order(...)` — atomic driver assignment |
| `create_reject_and_delete_order_rpc` | `CREATE FUNCTION reject_order(...)` dan `delete_order(...)` |
| `add_anon_select_policies_for_customers` | 4 policy baru untuk anon SELECT di orders, order_items, order_status_history |

## Build Status
Build berhasil tanpa error.

---

## Ringkasan Commit

| Commit | Pesan |
|--------|-------|
| `de23bd4` | `fix: resolve customer auth, driver deletion, and category rendering bugs` |
| `bd5a0b5` | `fix: improve order creation error handling and data validation` |
| `b0610e8` | `fix: bypass RLS for order creation using create_order RPC function` |
| `712f425` | `fix: use assign_driver_to_order RPC to ensure driver sees assigned orders` |
| `6a17671` | `feat: add order management and fix checkout validation` |
