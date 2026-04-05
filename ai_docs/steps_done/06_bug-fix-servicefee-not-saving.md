# 06 - Bug Fix: Service Fee Tidak Bisa Diubah di Settings

**Tanggal:** 2026-04-05
**Scope:** Perbaikan bug service fee dan fee lainnya yang tidak tersimpan di Settings

---

## Masalah

Admin mengubah nilai service fee (atau fee lainnya) di halaman Settings, sudah klik "Simpan Pengaturan", muncul toast success, tapi nilai di database **tidak berubah**.

---

## Root Cause Analysis

### Kode Lama (Bermasalah)
```typescript
// Settings.tsx - handleSaveFees()
for (const [key, value] of Object.entries(feeForm)) {
  const { error } = await supabase
    .from("fee_settings")
    .update({ value: parseInt(String(value)) || 0, updated_at: new Date().toISOString() })
    .eq("key", key);
}
```

**Masalah**: Method `.update().eq()` di Supabase adalah **silent no-op** jika row tidak ditemukan. Artinya:
- Jika row dengan `key` tertentu **tidak ada**, query tidak error tapi juga **tidak melakukan apa-apa**
- Toast success tetap muncul karena tidak ada error
- Database tetap dengan nilai lama

**Kemungkinan penyebab row tidak ada:**
1. Migration yang gagal atau tidak dijalankan
2. Key tertentu (misalnya `min_distance_km`) tidak di-insert saat setup awal
3. Ada perbedaan nama key antara kode dan database

### Fix: Gunakan Upsert
```typescript
// Settings.tsx - handleSaveFees() (FIXED)
for (const [key, value] of Object.entries(feeForm)) {
  const parsedValue = parseInt(String(value)) || 0;
  
  // Use upsert instead of update to handle both insert and update
  const { data: result, error } = await supabase
    .from("fee_settings")
    .upsert({ key, value: parsedValue, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select();

  if (error) {
    console.error(`Error upserting ${key}:`, error);
    throw error;
  }
}
```

**Mengapa upsert lebih baik:**
- `.upsert()` = **UPDATE jika ada, INSERT jika tidak ada**
- `{ onConflict: "key" }` memberitahu Supabase untuk menggunakan kolom `key` sebagai konflik resolution
- Tidak ada lagi silent no-op — jika row belum ada, akan di-insert otomatis
- Tetap aman jika row sudah ada (akan di-update)

---

## Perubahan yang Dilakukan

### File: `src/app/pages/admin/Settings.tsx`

**Perubahan:**
- `handleSaveFees()` — ganti `.update().eq()` dengan `.upsert({ key, value }, { onConflict: "key" })`
- Tambah logging untuk debugging: log form data, existing value, result per key
- Tambah `console.error` di catch block untuk error visibility

### File: `src/app/contexts/DataContext.tsx`

**Perubahan:**
- `refreshFeeSettings()` — tambah error handling dan logging
- Log raw data dan parsed data untuk verifikasi

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/app/pages/admin/Settings.tsx` | Ganti update → upsert, tambah logging |
| `src/app/contexts/DataContext.tsx` | Tambah logging di refreshFeeSettings |

## Database
Tidak ada perubahan schema. Upsert akan otomatis insert row yang missing.

## Build Status
Build berhasil tanpa error (18.34s)

---

## Cara Test

1. Login sebagai admin
2. Buka Settings → Konfigurasi Fee
3. Ubah nilai Service Fee (misalnya dari 2000 → 5000)
4. Klik "Simpan Pengaturan"
5. Refresh halaman
6. **Expected**: Nilai tetap 5000 (tidak kembali ke 2000)
7. **Console check**: Buka browser console, lihat log "=== SAVING FEE SETTINGS ===" dan "=== FEE SETTINGS RAW DATA ===" untuk verifikasi

---

## Catatan Penting

Jika setelah fix ini masih ada masalah, kemungkinan:
1. **RLS Policy**: Cek apakah ada RLS policy yang memblokir INSERT/UPDATE di tabel `fee_settings`
2. **Primary Key/Unique Constraint**: Pastikan kolom `key` punya unique constraint untuk `onConflict` bekerja
3. **Tipe data**: Pastikan `value` di database adalah `integer` bukan `numeric` (perbedaan parsing)

Untuk verifikasi database, jalankan di Supabase SQL editor:
```sql
-- Cek semua rows di fee_settings
SELECT key, value, updated_at FROM fee_settings ORDER BY key;

-- Cek schema tabel
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fee_settings';

-- Cek constraint
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'fee_settings'::regclass;
```
