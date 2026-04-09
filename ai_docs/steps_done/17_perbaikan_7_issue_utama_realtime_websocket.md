# Step 17 — Perbaikan 7 Issue Utama + Realtime WebSocket

**Tanggal:** 9 April 2026  
**Scope:** 7 issue utama + perbaikan lanjutan berdasarkan hasil manual testing  
**Build:** ✅ TypeScript 0 errors | Vite build SUCCESS  

---

## Ringkasan Eksekusi

### Session Pertama: Implementasi Awal (7 Issues)

| # | Issue | Fix Utama | File |
|---|-------|-----------|------|
| 1 | Upload bukti pembayaran 403 + admin reject modal | Bucket public + RLS policy + modal alasan | `AdminPanel.tsx`, `PaymentInstruction.tsx`, DB Migration |
| 2 | Notifikasi cancelled order masih aktif | Filter cancelled di NotificationContext + badge History | `NotificationContext.tsx`, `History.tsx`, `OrderTracking.tsx` |
| 3 | Admin logout saat refresh | Fix infinite loop di AuthContext | `AuthContext.tsx` |
| 4 | forwardRef warning di driver panel | Update Radix packages | `button.tsx`, `alert-dialog.tsx`, `package.json` |
| 5 | Realtime admin tidak update | REPLICA IDENTITY FULL + supabase_realtime publication | DB Migration |
| 6 | Banner tanpa info dimensi mobile | Info 1080×540px + preview mobile + safe area | `BannerManagement.tsx` |
| 7 | Driver management enhancements | Reset password + DANA number + edit data | `DriverManagement.tsx`, `reset-driver-password` edge function |

### Session Kedua: Perbaikan Berdasarkan Manual Test (Round 2)

| Issue | Masalah | Fix | File |
|-------|---------|-----|------|
| R1 | Notifikasi cancelled masih muncul | Join orders table untuk filter status cancelled | `NotificationContext.tsx` |
| R2 | Upload bukti masih 403 | Tambah policy INSERT untuk `anon` role | DB Migration |
| R3 | Realtime masih manual refresh | Polling 5 detik + REPLICA IDENTITY FULL | `DataContext.tsx`, DB Migration |
| R4 | forwardRef warning masih ada | Update Radix ke versi terbaru | `package.json` |
| R5 | Driver offline bisa di-assign | Filter `is_online` di dropdown admin | `AdminPanel.tsx` |

### Session Ketiga: Perbaikan Berdasarkan Manual Test (Round 3)

| Issue | Masalah | Fix | File |
|-------|---------|-----|------|
| WebSocket failed | Orders table tidak ada di publication | `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders` | DB Migration |
| Notifikasi cancelled bandel | Filter tidak join orders table | Join orders table + batch fetch status | `NotificationContext.tsx` |
| Polling terlalu lama | 10 detik → 5 detik | Ubah interval | `DataContext.tsx` |

### Session Keempat: Testing & Eksperimen

| Perubahan | Keterangan | File |
|-----------|------------|------|
| Disable polling | Untuk testing WebSocket-only | `DataContext.tsx` |
| Disable notifications | Untuk eksperimen | `NotificationContext.tsx`, `OrderTracking.tsx` |
| Disable banner "Pesanan Aktif" | Untuk testing | `Home.tsx` |
| Re-enable banner dengan filter | Hanya tampil untuk status aktif (bukan cancelled/completed) | `Home.tsx` |

---

## Detail Perubahan

### 1. Database Migrations

#### Migration: `20260409000000_fix_payment_bucket_driver_fields.sql`
```sql
-- 1. Buat bucket payment-proofs menjadi public
UPDATE storage.buckets SET public = true WHERE id = 'payment-proofs';

-- 2. Tambah kolom payment_rejection_reason di tabel orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;

-- 3. Tambah kolom dana_number di tabel profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dana_number TEXT;

-- 4. Index untuk query cancelled order
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
```

#### Migration: `20260409000002_fix_realtime_and_storage.sql`
```sql
-- Fix #4/#6: Enable full row data in realtime UPDATE events
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Fix #2: Allow authenticated users to upload ke payment-proofs
CREATE POLICY "Allow authenticated uploads to payment-proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated read payment-proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow authenticated delete payment-proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs');
```

#### Migration: `20260409000003_fix_payment_proofs_anon_policy.sql`
```sql
-- Fix R3: Allow ANON users (Customer Role) to upload ke payment-proofs
-- Customer login via LocalStorage → request sebagai anon role
CREATE POLICY "Allow anon uploads to payment-proofs"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow anon read payment-proofs"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow anon delete payment-proofs"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'payment-proofs');
```

#### Migration: `20260409000004_fix_realtime_publication.sql`
```sql
-- Fix Realtime: Add orders table ke supabase_realtime publication
-- Tanpa ini, PostgreSQL WAL tidak mengirim perubahan ke realtime service
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

### 2. Edge Function

#### `supabase/functions/reset-driver-password/index.ts`
- Edge function untuk reset password driver via Supabase Admin API
- Menggunakan service role key untuk update password
- CORS headers ditambahkan untuk akses dari localhost
- Deployed via Supabase MCP (version 2)

### 3. Perubahan File Frontend

#### `src/app/contexts/AuthContext.tsx`
- **Fix infinite loop:** Ignore `SIGNED_IN` event di `onAuthStateChange`
- **Fix session conflict:** Clear customer localStorage saat admin/driver login
- **Fix customer cleanup:** `await supabase.auth.signOut()` saat customer login
- Re-fetch profile saat session berubah

#### `src/app/contexts/NotificationContext.tsx`
- **Initial load:** Join orders table untuk filter cancelled notifications
- **Realtime INSERT:** Check order status sebelum tampilkan notifikasi
- **Batch fetch:** Fetch status semua order dalam satu query (`WHERE id IN (...)`)
- **Disabled untuk testing:** Seluruh useEffect dikomentari (bisa di-uncomment untuk re-enable)

#### `src/app/contexts/DataContext.tsx`
- **Polling fallback:** Interval 5 detik untuk refresh orders (disabled untuk testing WebSocket-only)
- Realtime subscription via WebSocket tetap aktif

#### `src/app/pages/admin/AdminPanel.tsx`
- **Modal reject payment:** Textarea untuk alasan penolakan (wajib diisi)
- **Driver assignment:** Filter offline driver di dropdown + pesan peringatan
- **Status colours:** Tambah `cancelled` status dengan badge merah
- Import `AlertCircle` untuk icon penolakan

#### `src/app/pages/customer/History.tsx`
- **Cancelled badge:** Tambah badge "Dibatalkan" (merah) untuk status cancelled
- **Hide Lacak button:** Ganti tombol "Lacak" jadi badge "Dibatalkan" untuk cancelled orders

#### `src/app/pages/customer/OrderTracking.tsx`
- **Cancelled status:** Tambah `cancelled` ke `orderStatuses` array
- **Status progress:** `cancelled` = 0% progress
- **Banner cancelled:** Banner merah "Pesanan Dibatalkan" dengan info pengembalian dana
- **Badge tracking:** Badge "Dibatalkan" (merah) untuk cancelled orders
- **Toast disabled:** useEffect detect status change + toast dikomentari untuk testing

#### `src/app/pages/customer/Home.tsx`
- **Banner "Pesanan Aktif":** Filter hanya tampilkan order yang BUKAN `cancelled` dan BUKAN `completed`
- Status yang tampil: `pending`, `driver_assigned`, `processing`, `going-to-store`, `picked-up`, `on-delivery`

#### `src/app/pages/customer/PaymentInstruction.tsx`
- **Rejection banner:** Banner merah menampilkan alasan penolakan dari admin
- Cast `(order as any)` untuk akses `payment_rejection_reason`

#### `src/app/components/BannerManagement.tsx`
- **Dimensi info:** "📁 Maks file: 5MB | Format: JPG / PNG / WEBP"
- **Rekomendasi mobile:** "📱 Ukuran rekomendasi mobile: 1080 × 540 px (Rasio 2:1)"
- **Mobile preview:** Toggle button "Lihat Preview Mobile" dengan phone mockup + safe area overlay
- **Thumbnail badge:** Badge "Mobile 2:1" di pojok bawah thumbnail banner

#### `src/app/components/DriverManagement.tsx`
- **Reset Password:** Tombol "Reset Password" (ungu) di setiap kartu driver
- **Modal reset:** Konfirmasi → edge function dipanggil → password baru ditampilkan
- **DANA field:** Field "Nomor DANA (opsional)" di form edit driver
- **DANA display:** Nomor DANA ditampilkan di kartu driver + tombol copy
- Import: `Key`, `CreditCard` icons + `supabase` client

#### `src/app/components/ui/button.tsx`
- **forwardRef:** `Button` component di-wrap dengan `React.forwardRef`

#### `src/app/components/ui/alert-dialog.tsx`
- **forwardRef:** `AlertDialogAction` dan `AlertDialogCancel` di-wrap dengan `React.forwardRef`

#### `src/app/components/ConfirmDialog.tsx`
- Sudah ada dari step sebelumnya (async handling + processing state)

### 4. Package Updates

#### `package.json`
```bash
npm install @radix-ui/react-slot@latest @radix-ui/react-primitive@latest @radix-ui/react-alert-dialog@latest
```

**Hasil:**
- `@radix-ui/react-slot`: 1.1.2 → **1.2.4**
- `@radix-ui/react-primitive`: 2.0.2 → **2.1.4**
- `@radix-ui/react-alert-dialog`: 1.1.6 → **1.1.15**

---

## Research & Referensi

### Web Search Results

| Query | Sumber | Temuan |
|-------|--------|--------|
| "Supabase Realtime WebSocket connection closed" | GitHub Issue #1442 | Workaround: downgrade supabase-js ke 2.49.1 |
| "Supabase Realtime RLS policies subscription" | Technet Experts | Grant SELECT ke supabase_realtime role + add table ke publication |
| "Supabase Realtime authorization" | Supabase Docs | RLS policies di realtime.messages table untuk private channels |
| "Fix Supabase realtime when RLS enabled" | Medium | Step 1: Enable realtime, Step 2: Enable RLS, Step 3: Grant SELECT |

### Supabase MCP Queries

| Query | Hasil |
|-------|-------|
| `pg_publication_tables WHERE pubname = 'supabase_realtime'` | Sebelum: `[]` (kosong) → Sesudah: `[{tablename: 'orders'}]` |
| `pg_class WHERE relname = 'orders'` | `relreplident = 'f'` (full) ✅ |
| `pg_policies WHERE tablename = 'orders'` | 5 policies aktif (SELECT anon/authenticated, INSERT anon/authenticated, UPDATE admin/driver) |
| `storage.buckets WHERE id = 'payment-proofs'` | `public = true` ✅ |
| `pg_roles WHERE rolname LIKE '%realtime%'` | `supabase_realtime_admin` ada (bukan `supabase_realtime`) |

---

## Build Status

| Check | Status | Detail |
|-------|--------|--------|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors | Semua file compile tanpa error |
| Vite Build (`npx vite build`) | ✅ SUCCESS (7.38s) | 2790 modules transformed |
| Edge Function Deploy | ✅ SUCCESS (version 2) | CORS headers ditambahkan |
| Database Migrations | ✅ 4 migrations applied | Payment bucket, realtime, storage policies |

---

## File yang Dibuat

| File | Tujuan |
|------|--------|
| `supabase/migrations/20260409000000_fix_payment_bucket_driver_fields.sql` | Bucket public + kolom baru |
| `supabase/migrations/20260409000002_fix_realtime_and_storage.sql` | REPLICA IDENTITY + RLS policies |
| `supabase/migrations/20260409000003_fix_payment_proofs_anon_policy.sql` | Anon policy untuk customer upload |
| `supabase/migrations/20260409000004_fix_realtime_publication.sql` | Add orders ke publication |
| `supabase/functions/reset-driver-password/index.ts` | Edge function reset password |
| `ai_docs/test_report_2026-04-09.md` | Laporan test round 1 |
| `ai_docs/hotfix_performance_auth_2026-04-09.md` | Hotfix infinite loop |
| `ai_docs/manual_test_fix_round2_2026-04-09.md` | Laporan test round 2 |
| `ai_docs/manual_test_fix_round3_2026-04-09.md` | Laporan test round 3 |

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/app/contexts/AuthContext.tsx` | Fix infinite loop, session conflict, customer cleanup |
| `src/app/contexts/NotificationContext.tsx` | Filter cancelled notifications (join orders table) |
| `src/app/contexts/DataContext.tsx` | Polling fallback (disabled untuk testing) |
| `src/app/pages/admin/AdminPanel.tsx` | Modal reject payment, filter offline driver, cancelled status |
| `src/app/pages/customer/History.tsx` | Cancelled badge, hide Lacak button |
| `src/app/pages/customer/OrderTracking.tsx` | Cancelled status, banner, badge, toast disabled |
| `src/app/pages/customer/Home.tsx` | Banner "Pesanan Aktif" dengan filter status |
| `src/app/pages/customer/PaymentInstruction.tsx` | Rejection reason banner |
| `src/app/components/BannerManagement.tsx` | Dimensi info, mobile preview, safe area |
| `src/app/components/DriverManagement.tsx` | Reset password, DANA field, edit data |
| `src/app/components/ui/button.tsx` | forwardRef |
| `src/app/components/ui/alert-dialog.tsx` | forwardRef |
| `package.json` | Update Radix packages |

---

## Catatan Penting

### Realtime Architecture

**Dual approach yang diterapkan:**
1. **WebSocket (Supabase Realtime):** Instant update jika koneksi berhasil
   - Orders table ditambahkan ke `supabase_realtime` publication
   - `replica identity = full` untuk mengirim full row data di UPDATE events
2. **Polling (fallback):** Setiap 5 detik (disabled untuk testing)
   - Memastikan data update meskipun WebSocket gagal

**Mengapa WebSocket kadang gagal:**
- Customer login via LocalStorage → tidak ada JWT → WebSocket sebagai `anon` role
- RLS policies di orders table menggunakan `anon` role → bisa blocking realtime subscription
- Network/firewall blocking WebSocket traffic

### RLS Policies untuk Realtime

Untuk realtime berfungsi dengan benar:
1. ✅ Tabel harus ada di `supabase_realtime` publication
2. ✅ `replica identity = full`
3. ✅ RLS policy SELECT untuk `anon` role
4. ✅ Polling fallback (opsional)

### Session Management

**Customer:** Login via LocalStorage (nama + nomor HP), tidak pakai Supabase Auth
**Admin/Driver:** Login via Supabase Auth (email + password)

**Conflict resolution:**
- Customer login → clear Supabase session
- Admin/Driver login → clear customer localStorage

---

*Generated: 9 April 2026 — Step 17 Documentation*
