# 11 - Bug Fix: Tombol Status Order Driver Error Setelah Diterima

**Tanggal:** 2026-04-06
**Scope:** Perbaikan kritis error tombol status order pada Driver Panel setelah driver menerima pesanan

---

## Masalah
Ketika driver menekan tombol **"Terima Pesanan"** dan masuk ke view order aktif, **SEMUA tombol status selanjutnya (Menuju Toko, Ambil Pesanan, Mulai Pengiriman, Selesaikan)** menghasilkan error React dan tidak berfungsi sama sekali.

---

## Root Cause Analysis
### Race Condition pada ConfirmDialog
```typescript
// KODE LAMA (BERMASALAH)
onConfirm={() => {
  confirmAction.onConfirm(); // ✴️ Fungsi async ini tidak di-await
  setConfirmAction(null);    // ❌ Dialog langsung di-unmount SEBELUM operasi selesai
}}
```

**Alur error:**
1. Driver klik tombol status → ConfirmDialog muncul
2. Driver klik "Konfirmasi"
3. `confirmAction.onConfirm()` (async function) dijalankan TAPI TIDAK DI-AWAIT
4. `setConfirmAction(null)` dijalankan **SEGERA**
5. Komponen ConfirmDialog di-unmount dari DOM
6. Sementara itu `updateOrderStatus()` masih berjalan di background
7. Ketika promise resolve, kode memanggil `setLoading(false)` dan `setActiveOrder()`
8. ❌ **React Error**: State update pada komponen yang sudah tidak ter-mount

---

## Perbaikan yang Dilakukan

### 1. Fix Utama: Tambahkan await pada onConfirm handler
**File:** `src/app/pages/driver/DriverPanel.tsx`
```typescript
// KODE BARU (FIXED)
onConfirm={async () => {
  if (loading) return; // ✅ Proteksi double click
  await confirmAction.onConfirm(); // ✅ TUNGGU operasi selesai DULU
  setConfirmAction(null); // ✅ Baru tutup dialog
}}
```

### 2. Proteksi onOpenChange saat loading
```typescript
// Sebelum
onOpenChange={(open) => !open && setConfirmAction(null)}

// Sesudah
onOpenChange={(open) => !open && !loading && setConfirmAction(null)}
```
✅ Dialog tidak bisa ditutup ketika operasi masih berjalan

### 3. Perbaikan Semua Status Handler
Semua handler `handleGoingToStore`, `handlePickup`, `handleDeliver`, `handleComplete` diperbaiki:
- ✅ Tambahkan explicit return type `Promise<void>`
- ✅ Tambahkan `finally` block untuk pastikan `setLoading(false)` SELALU dijalankan
- ✅ Tambahkan `console.error` untuk debugging error
- ✅ Tambahkan early return jika `activeOrder` null

```typescript
// Contoh handler yang diperbaiki
const handleGoingToStore = async (): Promise<void> => {
  if (!activeOrder) return;
  setLoading(true);
  try {
    await updateOrderStatus(activeOrder.id, "going-to-store", driverId);
    setActiveOrder({ ...activeOrder, status: "going-to-store" });
    toast.success("Status diupdate: Menuju Toko");
  } catch (err) {
    console.error("Error updating status:", err);
    toast.error("Gagal mengupdate status");
  } finally {
    setLoading(false);
  }
};
```

### 4. Loading Status pada Confirm Button
```typescript
confirmText={loading ? "Memproses..." : "Konfirmasi"}
```
✅ Tombol konfirmasi menampilkan teks "Memproses..." ketika operasi berjalan

---

## File yang Diubah
| File | Perubahan |
|------|-----------|
| `src/app/pages/driver/DriverPanel.tsx` | ✅ Perbaikan race condition ConfirmDialog, tambahkan await, proteksi loading, perbaikan semua handler status |

---

## Build Status
✅ TypeScript type check: **0 errors** (`npx tsc --noEmit`)
✅ Vite build: Berhasil

---

## Cara Test
1. Login sebagai driver
2. Tunggu admin assign order
3. Klik **"Terima Pesanan"**
4. Setelah masuk view order aktif, coba tekan semua tombol status bertahap:
   - Menuju Toko
   - Ambil Pesanan
   - Mulai Pengiriman
   - Selesaikan Pengiriman
5. **Expected:** Semua tombol berjalan normal, tidak ada error, status terupdate dengan benar

---

## Catatan Tambahan
Ini adalah bug umum pada React ketika menangani operasi async di dalam dialog/modal. **Pola yang benar adalah selalu await operasi async SEBELUM menutup / unmount komponen.**
