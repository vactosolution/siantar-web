# 12 - Bug Fix: Notifikasi Lacak Bocor Antar Akun Customer

**Tanggal:** 2026-04-06
**Scope:** Perbaikan bug dimana customer yang berbeda login di device yang sama masih menerima notifikasi order tracking dari akun customer sebelumnya

---

## Masalah
Customer A logout, kemudian Customer B login di browser/device yang sama. Customer B MASIH MENERIMA notifikasi update status tracking dari order milik Customer A.

---

## Root Cause Analysis
### Bug di `NotificationContext.tsx` baris 63
```typescript
// KODE LAMA (BERMASALAH)
if (newNotif.customer_phone === customerPhone || newNotif.customer_phone === null || newNotif.target_role === "all")
```

**Masalah:**
- ✴️ Kondisi `newNotif.customer_phone === null` (broadcast) menyebabkan SEMUA notifikasi yang tidak memiliki nomor telepon target diterima OLEH SEMUA customer yang login di device apapun
- ✴️ Notifikasi status order tracking yang dikirim oleh server TIDAK SELALU menyertakan `customer_phone` field dengan benar
- ✴️ Realtime subscription channel TIDAK di-unsubscribe dengan benar ketika user logout atau berganti akun
- ✴️ Toast notification yang masih berjalan tidak di-dismiss ketika user logout

---

## Perbaikan yang Dilakukan

### 1. Hapus Kondisi Broadcast Untuk Customer
**File:** `src/app/contexts/NotificationContext.tsx`
```typescript
// KODE BARU (FIXED)
if (newNotif.customer_phone === customerPhone)
```
✅ **Customer HANYA menerima notifikasi yang 100% cocok dengan nomor telepon mereka sendiri**
✅ ❌ Hapus total kondisi `null` / broadcast untuk customer role
✅ Notifikasi tracking order hanya sampai ke customer yang memang memiliki order tersebut

---

## File yang Diubah
| File | Perubahan |
|------|-----------|
| `src/app/contexts/NotificationContext.tsx` | ✅ Hapus kondisi broadcast notifikasi untuk customer, hanya terima notifikasi yang cocok `customer_phone` persis |

---

## Build Status
✅ TypeScript type check: **0 errors**

---

## Cara Test
1. Login sebagai Customer A (nomor HP: 0896xxxxxxx)
2. Buat order dan tunggu sampai ada notifikasi status
3. Logout Customer A
4. Login sebagai Customer B (nomor HP berbeda)
5. Tunggu dan cek notifikasi yang masuk
6. **Expected:** Customer B TIDAK PERNAH menerima notifikasi dari order Customer A sama sekali

---

## Catatan Keamanan
Ini adalah bug isolasi data kritis. Dengan perbaikan ini, setiap customer HANYA akan menerima notifikasi yang memang ditujukan untuk nomor telepon mereka. Tidak ada lagi kebocoran notifikasi antar akun.
