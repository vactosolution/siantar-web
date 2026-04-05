# 09 - Bug Fix: Kode Unik Pembayaran Bisa Duplikat

**Tanggal:** 2026-04-05
**Scope:** Perbaikan kode unik pembayaran 3 digit agar tidak duplikat antar order

---

## Masalah

Customer yang bayar via transfer mendapat kode unik 3 digit (100-999) yang ditambahkan ke total pembayaran.
Fungsi `generateUniquePaymentCode()` hanya pakai `Math.random()` — **tidak ada pengecekan apakah kode sudah dipakai order lain hari itu**.

**Dampak:** Dua customer berbeda bisa mendapat kode unik yang sama, menyulitkan admin untuk memverifikasi pembayaran secara akurat.

---

## Root Cause Analysis

### Kode Lama
```typescript
// financeCalculations.ts
export function generateUniquePaymentCode(): number {
  return Math.floor(100 + Math.random() * 900); // 100-999
}

// Checkout.tsx
const uniquePaymentCode = paymentMethod !== "cod"
  ? generateUniquePaymentCode()  // ❌ Tidak cek apakah sudah dipakai
  : null;
```

**Masalah:**
- `Math.random()` bisa menghasilkan angka yang sama
- Tidak ada pengecekan ke database/order existing
- Tidak ada retry mechanism jika duplikat

---

## Fix

### 1. `financeCalculations.ts` — Tambah Parameter existingOrderCodes

```typescript
// BEFORE
export function generateUniquePaymentCode(): number {
  return Math.floor(100 + Math.random() * 900);
}

// AFTER
export function generateUniquePaymentCode(existingOrderCodes: number[] = []): number {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(100 + Math.random() * 900);
    if (!existingOrderCodes.includes(code)) {
      return code;
    }
  }
  // Fallback: use timestamp-based code if all attempts fail
  return 100 + (Date.now() % 900);
}
```

**Mekanisme:**
1. Generate kode random (100-999)
2. Cek apakah sudah ada di `existingOrderCodes`
3. Jika ada, retry (max 100 kali)
4. Jika 100x gagal, fallback ke timestamp-based code

### 2. Update Semua Caller

**Checkout.tsx, KirimBarang.tsx, ManualOrderCreation.tsx:**
```typescript
// Collect existing codes from today's orders to avoid duplicates
const today = new Date().toDateString();
const todayOrderCodes = orders
  .filter(o => o.unique_payment_code && new Date(o.created_at).toDateString() === today)
  .map(o => o.unique_payment_code as number);

const uniquePaymentCode = paymentMethod !== "cod"
  ? generateUniquePaymentCode(todayOrderCodes)
  : null;
```

**Scope:** Cek duplikat hanya untuk order hari ini (bukan semua order sepanjang masa). Ini reasonable karena:
- Kode unik hanya perlu unik per hari (admin verifikasi harian)
- Menghindari performa buruk dengan scan semua order

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/app/utils/financeCalculations.ts` | Tambah parameter `existingOrderCodes` + retry logic |
| `src/app/pages/customer/Checkout.tsx` | Pass today's order codes, import `orders` dari useData |
| `src/app/pages/customer/KirimBarang.tsx` | Pass today's order codes, import `orders` dari useData |
| `src/app/components/ManualOrderCreation.tsx` | Pass today's order codes, import `orders` dari useData |

## Build Status
Build berhasil tanpa error (10.64s)

---

## Cara Test

1. Login sebagai customer
2. Buat order dengan metode pembayaran transfer
3. Catat kode unik yang muncul (misal: 347)
4. Buat order kedua dengan metode pembayaran transfer
5. **Expected:** Kode unik berbeda (bukan 347)
6. Ulangi hingga 10+ order — semua kode harus berbeda

---

## Catatan

### Edge Case: 1000+ Order per Hari
Dengan 900 kemungkinan kode (100-999) dan 1000+ order, akan ada duplikat. Fallback timestamp-based code (`100 + (Date.now() % 900)`) masih bisa duplikat.

**Solusi Future Enhancement:**
- Gunakan 4 digit (1000-9999) untuk volume tinggi
- Atau kombinasikan timestamp + random: `100 + ((Date.now() + Math.random()) % 900)`
- Atau generate di database dengan auto-increment sequence
