# 07 - Bug Fix: Tolak Pesanan Gagal (Constraint Violation)

**Tanggal:** 2026-04-05
**Scope:** Perbaikan bug tolak pesanan di admin panel yang gagal karena constraint violation

---

## Masalah

Admin klik "Tolak Pesanan" pada order pending, tapi gagal dengan error:

```
POST /rpc/reject_order → 400 Bad Request
{
    "code": "23514",
    "message": "new row for relation \"orders\" violates check constraint \"orders_status_check\"",
    "details": "Failing row contains (..., status: cancelled, ...)"
}
```

---

## Root Cause Analysis

### 1. Constraint `orders_status_check` Tidak Mengizinkan `cancelled`

**Constraint yang aktif di database:**
```sql
CHECK ((status = ANY (ARRAY['pending', 'driver_assigned', 'processing', 
  'going-to-store', 'picked-up', 'on-delivery', 'completed'])))
```

**Missing statuses:** `cancelled`, `rejected`

### 2. RPC `reject_order` Menggunakan Status `cancelled`

```sql
-- reject_order RPC function
UPDATE public.orders
SET status = 'cancelled', updated_at = NOW()  -- ❌ 'cancelled' tidak ada di constraint!
WHERE id = p_order_id;
```

**Hasil:** Database menolak update karena `cancelled` bukan status yang valid menurut constraint.

### Penyebab

Ada ketidakonsistenan antara migration yang seharusnya dijalankan:
- Phase 1 docs menyebut constraint harus include `cancelled`
- Phase 7 docs menyebut constraint harus include `driver_assigned`
- **Yang aktif di database:** hanya `pending, driver_assigned, processing, going-to-store, picked-up, on-delivery, completed`

Kemungkinan migration yang seharusnya push `cancelled` ke constraint tidak pernah berhasil dieksekusi di remote database.

---

## Fix

### 1. Database Migration (via Supabase MCP)

```sql
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'driver_assigned', 'processing', 'going-to-store', 
    'picked-up', 'on-delivery', 'completed', 'cancelled'));
```

**Verification:**
```sql
CHECK ((status = ANY (ARRAY['pending', 'driver_assigned', 'processing', 
  'going-to-store', 'picked-up', 'on-delivery', 'completed', 'cancelled'])))
```

✅ Constraint sekarang mengizinkan `cancelled`.

### 2. Fix Variant Type di ConfirmDialog

**File:** `src/app/components/ConfirmDialog.tsx`

**Masalah:** AdminPanel mengirim `variant="destructive"` tapi ConfirmDialog hanya menerima `"default" | "danger"`.

**Fix:** Tambah `"destructive"` ke union type dan handle di class logic:

```typescript
// Before
variant?: "default" | "danger";

// After
variant?: "default" | "danger" | "destructive";

const variantClass = variant === "destructive" || variant === "danger"
  ? "bg-red-600 text-white hover:bg-red-700"
  : "bg-[#FF6A00] text-white hover:bg-[#FF6A00]/90";
```

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| Database (via Supabase MCP) | Update `orders_status_check` constraint tambah `cancelled` |
| `src/app/components/ConfirmDialog.tsx` | Tambah variant `destructive` |

## Build Status
Build berhasil tanpa error (19.28s)

---

## Cara Test

1. Login sebagai admin
2. Buka Admin Panel → tab Orders
3. Cari order dengan status `pending`
4. Klik "Tolak Pesanan"
5. Konfirmasi di dialog
6. **Expected:** Order status berubah jadi `cancelled`, toast success muncul

---

## Catatan

### Warning React forwardRef (Non-Kritis)
```
Warning: Function components cannot be given refs. 
Did you mean to use React.forwardRef()?
```

Warning ini berasal dari Radix UI AlertDialog primitives dan tidak mempengaruhi fungsionalitas. Ini adalah known issue antara Radix UI dan React 19. Tidak memerlukan fix segera.
