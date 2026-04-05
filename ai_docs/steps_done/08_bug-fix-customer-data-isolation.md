# 08 - Bug Fix: Data Customer Bocor Antar Akun

**Tanggal:** 2026-04-05
**Scope:** Perbaikan bug keamanan dimana keranjang, riwayat pesanan, dan tracking pesanan customer lain muncul di akun customer berbeda

---

## Masalah

Customer A membuat pesanan dengan nama "Erik" dan nomor "089646466434".
Customer B login dengan nama dan nomor HP berbeda, tapi:
- ✅ **Keranjang belanja** Customer A muncul di akun Customer B
- ✅ **Riwayat pesanan** Customer A muncul di akun Customer B
- ✅ **Tracking pesanan** Customer A bisa diakses Customer B

---

## Root Cause Analysis

### 1. CartContext — localStorage Key Global

```typescript
// BEFORE: Key global, semua customer berbagi keranjang yang sama
const [items, setItems] = useState<CartItem[]>(() => {
  const saved = localStorage.getItem('siantar_cart'); // ❌ Global key
  if (saved) return JSON.parse(saved);
  return [];
});
```

**Dampak:** Semua customer yang pakai browser/device yang sama berbagi keranjang yang sama.

### 2. History.tsx — Filter Menggunakan OR (Bukan AND)

```typescript
// BEFORE: Match nama ATAU telepon — salah satu cukup
const customerOrders = orders.filter((order) => {
  if (customerName && order.customer_name === customerName) return true;  // ❌ OR logic
  if (customerPhone && order.customer_phone === customerPhone) return true; // ❌ OR logic
  return false;
});
```

**Dampak:** 
- Nama berbeda TAPI telepon sama → order muncul
- Telepon berbeda TAPI nama sama → order muncul
- Jika nama "Test" dan telepon "123", semua order dengan nama "Test" ATAU telepon "123" muncul

### 3. OrderTracking.tsx — Tidak Ada Validasi Ownership

Siapapun bisa akses tracking order manapun hanya dengan tahu order ID. Tidak ada pengecekan apakah order tersebut milik customer yang sedang login.

### 4. AuthContext — customerPhone Tidak Ada di Context

`customerPhone` hanya disimpan di localStorage, tidak ada di React context state, sehingga komponen lain tidak bisa mengaksesnya dengan reaktif.

---

## Fix

### 1. AuthContext — Tambah customerPhone ke State & Context

**File:** `src/app/contexts/AuthContext.tsx`

```typescript
// BEFORE
interface AuthContextType {
  username: string;
  driverId: string | null;
  // ...
}

// AFTER
interface AuthContextType {
  username: string;
  customerPhone: string; // ✅ Baru
  driverId: string | null;
  // ...
}
```

- Tambah state `customerPhone` 
- Set saat restore session dari localStorage
- Set saat customer login
- Clear saat logout

### 2. CartContext — Scope localStorage Key Per Customer Phone

**File:** `src/app/contexts/CartContext.tsx`

```typescript
// BEFORE
localStorage.getItem('siantar_cart'); // ❌ Global key

// AFTER
function getCustomerCartKey(): string {
  const phone = localStorage.getItem("sianter_customer_phone");
  return phone ? `siantar_cart_${phone}` : "siantar_cart_global";
}
localStorage.getItem(getCustomerCartKey()); // ✅ Key per customer
```

**Contoh:**
- Customer dengan telepon "089646466434" → key: `siantar_cart_089646466434`
- Customer dengan telepon "081234567890" → key: `siantar_cart_081234567890`

### 3. History.tsx — Filter Menggunakan AND

**File:** `src/app/pages/customer/History.tsx`

```typescript
// BEFORE: OR logic
if (customerName && order.customer_name === customerName) return true;
if (customerPhone && order.customer_phone === customerPhone) return true;

// AFTER: AND logic
const customerOrders = orders.filter((order) => {
  if (!customerName || !customerPhone) return false;
  return order.customer_name === customerName && order.customer_phone === customerPhone; // ✅ AND
});
```

**Dampak:** Order hanya muncul jika **KEDUA** nama DAN telepon cocok.

### 4. OrderTracking.tsx — Validasi Ownership

**File:** `src/app/pages/customer/OrderTracking.tsx`

```typescript
// Tambah state ownership
const [isOwner, setIsOwner] = useState<boolean | null>(null);

// Validasi ownership saat order load
useEffect(() => {
  if (!currentOrder) {
    setIsOwner(false);
    return;
  }
  const customerName = localStorage.getItem("sianter_customer_name") || "";
  const owns = currentOrder.customer_name === customerName && currentOrder.customer_phone === customerPhone;
  setIsOwner(owns);
}, [currentOrder, customerPhone]);

// Tambah akses denied view
if (isOwner === false) {
  return (
    <div>
      <AlertCircle className="w-16 h-16 text-red-500" />
      <h2>Akses Ditolak</h2>
      <p>Anda tidak memiliki akses ke pesanan ini.</p>
      <Link to="/home/history">Lihat Riwayat Pesanan Anda</Link>
    </div>
  );
}
```

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/app/contexts/AuthContext.tsx` | Tambah `customerPhone` ke state & context |
| `src/app/contexts/CartContext.tsx` | Scope localStorage key per customer phone |
| `src/app/pages/customer/History.tsx` | Filter AND (nama DAN telepon), import useAuth |
| `src/app/pages/customer/OrderTracking.tsx` | Validasi ownership + akses denied view |

## Build Status
Build berhasil tanpa error (10.71s)

---

## Cara Test

### Test 1: Cart Isolation
1. Login sebagai Customer A (nama: "Erik", HP: "089646466434")
2. Tambah produk ke keranjang
3. Logout
4. Login sebagai Customer B (nama: "Test", HP: "081234567890")
5. **Expected:** Keranjang kosong

### Test 2: History Isolation
1. Login sebagai Customer A, buat pesanan
2. Logout
3. Login sebagai Customer B
4. Buka History
5. **Expected:** Pesanan Customer A **tidak** muncul

### Test 3: Tracking Access Denied
1. Login sebagai Customer A, catat Order ID (misal: `c5b705a9-...`)
2. Logout
3. Login sebagai Customer B
4. Akses URL: `/home/tracking/c5b705a9-...`
5. **Expected:** Halaman "Akses Ditolak" muncul

---

## Catatan Keamanan

### Current State: Customer Auth Sangat Lemah
Customer login hanya dengan nama + nomor HP tanpa verifikasi password/OTP. Ini berarti:
- ✅ Fix ini mencegah **accidental data leak** antar customer di device yang sama
- ❌ **Tidak mencegah malicious access** — siapapun bisa login dengan nama/HP customer lain dan lihat data mereka

### Rekomendasi Future Enhancement
- Implementasi OTP via WhatsApp/SMS untuk verifikasi nomor HP
- Atau minimal: password untuk customer login
- RLS policies di Supabase untuk customer orders (saat ini anon SELECT policy terlalu permisif)
