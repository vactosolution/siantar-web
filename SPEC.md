# 📋 SPEC — IMPLEMENTASI SIANTER

Rencana implementasi untuk menutup gap antara kodebase saat ini dan spesifikasi penuh SiAnter.
Dibagi menjadi **10 Phase** dengan **42 steps**. Setiap step mencantumkan file yang perlu diubah/dibuat.

---

## PHASE 1: DATABASE SCHEMA UPDATES

Semua perubahan bergantung pada schema database. Ini harus dilakukan pertama.

### Step 1.1 — Tambah kolom `is_best_seller` & `is_recommended` di tabel `products`

**Files:** Supabase Migration, `src/lib/database.types.ts`

```sql
ALTER TABLE public.products
  ADD COLUMN is_best_seller boolean DEFAULT false,
  ADD COLUMN is_recommended boolean DEFAULT false;
```

Update `src/lib/database.types.ts` — tambahkan kedua kolom di type `products` (Row, Insert, Update).

---

### Step 1.2 — Buat tabel `banners`

**Files:** Supabase Migration, `src/lib/database.types.ts`

```sql
CREATE TABLE public.banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.banners FOR ALL USING (true);
```

Tambah storage bucket baru: `banner-images`

---

### Step 1.3 — Buat tabel `notifications`

**Files:** Supabase Migration, `src/lib/database.types.ts`

```sql
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info','promo','order','system')),
  target_role text DEFAULT 'customer' CHECK (target_role IN ('customer','driver','all')),
  is_read boolean DEFAULT false,
  customer_phone text,
  order_id text REFERENCES public.orders(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.notifications FOR ALL USING (true);
```

---

### Step 1.4 — Buat tabel `driver_financial_transactions`

**Files:** Supabase Migration, `src/lib/database.types.ts`

```sql
CREATE TABLE public.driver_financial_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid REFERENCES public.profiles(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit','withdraw','earning','penalty','bonus')),
  amount integer NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.driver_financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.driver_financial_transactions FOR ALL USING (true);
```

---

### Step 1.5 — Set initial deposit 100.000 untuk driver baru

**Files:** `src/app/contexts/DataContext.tsx`

Di fungsi `addDriver()`: set `balance: 100000` saat insert profile baru driver.

---

### Step 1.6 — Tambah kolom `photo_url` di tabel `profiles`

**Files:** Supabase Migration, `src/lib/database.types.ts`

```sql
ALTER TABLE public.profiles ADD COLUMN photo_url text;
```

---

### Step 1.7 — Update `database.types.ts` (finalisasi)

**Files:** `src/lib/database.types.ts`

Tambahkan type definitions lengkap untuk:
- `banners` (Row, Insert, Update)
- `notifications` (Row, Insert, Update)
- `driver_financial_transactions` (Row, Insert, Update)
- Update `products` dengan `is_best_seller`, `is_recommended`
- Update `profiles` dengan `photo_url`

---

## PHASE 2: BUG FIXES (KRITIS)

Fix yang sudah rusak dulu sebelum bangun fitur baru.

### Step 2.1 — Fix `customerName` vs `customer_name` di Navbar

**File:** `src/app/components/Navbar.tsx:22`

```diff
- order.customerName === username &&
+ order.customer_name === username &&
```

Bug ini membuat active order check selalu gagal sehingga notifikasi pesanan aktif tidak pernah muncul di navbar.

---

### Step 2.2 — Fix Route Guards

**File:** `src/app/routes.tsx`

Bungkus route `/admin` dan `/driver` dengan `ProtectedRoute`:

```tsx
<Route path="/admin" element={
  <ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>
} />
<Route path="/admin/outlet/:outletId/menu" element={
  <ProtectedRoute role="admin"><OutletMenuManagement /></ProtectedRoute>
} />
<Route path="/admin/settings" element={
  <ProtectedRoute role="admin"><Settings /></ProtectedRoute>
} />
<Route path="/driver" element={
  <ProtectedRoute role="driver"><DriverPanel /></ProtectedRoute>
} />
```

Update `src/app/components/ProtectedRoute.tsx` untuk redirect ke login yang sesuai jika tidak authenticated.

---

### Step 2.3 — Fix Race Condition `updateDriverBalance`

**Files:** `src/app/contexts/DataContext.tsx`, Supabase Migration

Ganti read-modify-write dengan Supabase RPC function:

```sql
CREATE OR REPLACE FUNCTION update_driver_balance(p_driver_id uuid, p_amount integer)
RETURNS void AS $$
  UPDATE public.profiles SET balance = balance + p_amount WHERE id = p_driver_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

Di `DataContext.tsx`, ganti logic manual dengan `.rpc('update_driver_balance', { p_driver_id, p_amount })`.

---

### Step 2.4 — Fix "Pesan Lagi" button di History

**File:** `src/app/pages/customer/History.tsx`

Tambahkan `onClick` handler:

```tsx
<button
  onClick={() => navigate(`/home/store/${order.outlet_id}`)}
  className="..."
>
  Pesan Lagi
</button>
```

---

### Step 2.5 — Fix Checkout pakai `alert()`

**File:** `src/app/pages/customer/Checkout.tsx`

Ganti semua `alert()` dengan `toast.error()` / `toast.success()` dari sonner.

```diff
- alert("Mohon lengkapi semua data");
+ toast.error("Mohon lengkapi semua data");
```

Lokasi: line 63, 67, 75, 144.

---

### Step 2.6 — Fix Delete Outlet pakai `window.confirm`

**File:** `src/app/pages/admin/AdminPanel.tsx:209`

Ganti `window.confirm()` dengan `ConfirmDialog` component (sudah diimport).

---

### Step 2.7 — Fix Cart tidak persist ke localStorage

**File:** `src/app/contexts/CartContext.tsx`

```tsx
// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('siantar_cart');
  if (saved) {
    try { setItems(JSON.parse(saved)); } catch {}
  }
}, []);

// Save to localStorage on change
useEffect(() => {
  localStorage.setItem('siantar_cart', JSON.stringify(items));
}, [items]);
```

---

### Step 2.8 — Fix Driver Logout tanpa konfirmasi

**File:** `src/app/pages/driver/DriverPanel.tsx:158`

Ganti `onClick={logout}` dengan `onClick={() => setShowLogoutConfirm(true)}` dan tambahkan `ConfirmDialog`.

---

## PHASE 3: REAL-TIME INFRASTRUCTUR

Semua panel butuh real-time sync. Ini fondasi utama.

### Step 3.1 — Buat helper Supabase Realtime

**File:** `src/lib/realtime.ts` (BARU)

```typescript
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

type ChangeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}) => void;

export function subscribeToTable(
  table: string,
  callback: ChangeCallback,
  filter?: string
): RealtimeChannel {
  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      callback
    )
    .subscribe();
  return channel;
}

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
```

---

### Step 3.2 — Integrasikan Realtime di DataContext

**File:** `src/app/contexts/DataContext.tsx`

Tambahkan `useEffect` untuk subscribe ke:

- `orders` — refresh orders saat ada INSERT/UPDATE
- `products` — refresh products saat ada perubahan
- `outlets` — refresh outlets saat ada perubahan
- `profiles` — refresh drivers saat balance/status berubah

```typescript
useEffect(() => {
  const ordersChannel = subscribeToTable('orders', () => refreshOrders());
  const productsChannel = subscribeToTable('products', () => refreshProducts());
  const outletsChannel = subscribeToTable('outlets', () => refreshOutlets());
  const profilesChannel = subscribeToTable('profiles', () => refreshDrivers());

  return () => {
    unsubscribe(ordersChannel);
    unsubscribe(productsChannel);
    unsubscribe(outletsChannel);
    unsubscribe(profilesChannel);
  };
}, []);
```

---

### Step 3.3 — Realtime untuk Notification (Customer)

**File:** `src/app/contexts/NotificationContext.tsx`

Tambahkan subscribe ke tabel `notifications` filtered by `customer_phone` atau `target_role = 'customer'`. Tampilkan toast + update unread count saat ada notifikasi baru.

---

### Step 3.4 — Realtime untuk Order Tracking (Customer)

**File:** `src/app/pages/customer/OrderTracking.tsx`

Ganti polling `setInterval` 3 detik dengan Supabase Realtime subscription pada order_id tertentu:

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes' as any, {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderId}`,
    }, (payload) => {
      setOrder(payload.new as Order);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [orderId]);
```

---

## PHASE 4: CUSTOMER HOME PANEL

Category Grid, Recommendation Slider, Best Seller, Banner, Menu Pilihan.

### Step 4.1 — Redesign Category System menjadi Grid 3x2

**File:** `src/app/pages/customer/Home.tsx`

Hapus category filter horizontal lama (4 tombol). Ganti dengan grid 3x2:

```tsx
const foodCategories = [
  { id: "Nasi Goreng & Mie Goreng", label: "Nasgor", icon: "🍚" },
  { id: "Bakso & Mie Ayam", label: "Bakso", icon: "🍜" },
  { id: "Ayam Bakar & Ayam Goreng", label: "Ayam", icon: "🍗" },
  { id: "Kopi & Teh", label: "Kopi", icon: "☕" },
  { id: "Sate & Grill", label: "Sate", icon: "🍢" },
  { id: "Soto & Sop", label: "Soto", icon: "🍲" },
];

// State untuk expand
const [showAllCategories, setShowAllCategories] = useState(false);
const visibleCategories = showAllCategories ? allCategories : foodCategories.slice(0, 6);
const hasMore = allCategories.length > 6;

// Render
<div className="grid grid-cols-3 gap-3">
  {visibleCategories.map(cat => (
    <button
      key={cat.id}
      onClick={() => setSelectedCategory(cat.id)}
      className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm
                 hover:shadow-md hover:border-orange-300 border-2 border-transparent
                 transition-all duration-200"
    >
      <span className="text-3xl mb-2">{cat.icon}</span>
      <span className="text-sm font-medium text-gray-700">{cat.label}</span>
    </button>
  ))}
  {hasMore && !showAllCategories && (
    <button
      onClick={() => setShowAllCategories(true)}
      className="flex flex-col items-center p-4 bg-gray-50 rounded-xl
                 border-2 border-dashed border-gray-300 hover:border-orange-300 transition-all"
    >
      <span className="text-3xl mb-2">⋯</span>
      <span className="text-sm font-medium text-gray-500">Lainnya</span>
    </button>
  )}
</div>
```

Filter logic: klik kategori → filter outlets berdasarkan `outlet.category === cat.id`.

---

### Step 4.2 — Tambahkan Recommendation Slider

**File:** `src/app/pages/customer/Home.tsx`

Tambahkan section antara Category Grid dan Outlet List. Gunakan carousel horizontal:

```tsx
<section className="mb-8">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Rekomendasi Untuk Kamu</h2>
  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
    {recommendedProducts.map(product => (
      <div key={product.id} className="min-w-[200px] bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0">
        <img src={product.image_url} className="w-full h-32 object-cover" />
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <p className="text-orange-600 font-bold text-sm">
            {formatCurrency(product.discount_price || product.price)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-gray-500">4.5</span>
          </div>
          <QuickAddButton product={product} />
        </div>
      </div>
    ))}
  </div>
</section>
```

Source data: filter `products` dengan `is_recommended === true`.

---

### Step 4.3 — Tambahkan Best Seller Section

**File:** `src/app/pages/customer/Home.tsx`

Tambahkan section di bawah Recommendation Slider:

```tsx
<section className="mb-8">
  <h2 className="text-xl font-bold text-gray-900 mb-4">⭐ Best Seller</h2>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {bestSellerProducts.map(product => (
      <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
        <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full z-10">
          ⭐ Best Seller
        </div>
        <img src={product.image_url} className="w-full h-32 object-cover" />
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <p className="text-orange-600 font-bold text-sm">
            {formatCurrency(product.discount_price || product.price)}
          </p>
          <QuickAddButton product={product} />
        </div>
      </div>
    ))}
  </div>
</section>
```

Source data: filter `products` dengan `is_best_seller === true`.

---

### Step 4.4 — Tambahkan Rating & Estimated Delivery di Outlet Card

**File:** `src/app/pages/customer/Home.tsx`

Tambahkan di dalam outlet card, setelah info desa:

```tsx
<div className="flex items-center gap-3 text-sm text-gray-500">
  <div className="flex items-center gap-1">
    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
    <span>4.5</span>
  </div>
  <div className="flex items-center gap-1">
    <Clock className="w-4 h-4" />
    <span>15-25 min</span>
  </div>
</div>
```

ETA bisa dihitung dari `distance_matrix.distance_km` (e.g. 5 min base + 2 min/km).

---

### Step 4.5 — Tambahkan "Menu Pilihan" Section

**File:** `src/app/pages/customer/Home.tsx`

Tambahkan section di bawah Outlet List:

```tsx
<section className="mb-8">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Menu Pilihan</h2>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {allProducts.slice(0, 6).map(product => {
      const outlet = outlets.find(o => o.id === product.outlet_id);
      return (
        <div
          key={product.id}
          onClick={() => navigate(`/home/store/${product.outlet_id}`)}
          className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        >
          <img src={product.image_url} className="w-full h-32 object-cover" />
          <div className="p-3">
            <h3 className="font-medium text-sm truncate">{product.name}</h3>
            <p className="text-xs text-gray-500">{outlet?.name}</p>
            <p className="text-orange-600 font-bold text-sm">
              {formatCurrency(product.discount_price || product.price)}
            </p>
          </div>
        </div>
      );
    })}
  </div>
</section>
```

---

### Step 4.6 — Tampilkan Banner Promo di Home

**File:** `src/app/pages/customer/Home.tsx` (atau buat component terpisah)

Tambahkan banner carousel di paling atas (sebelum hero/search bar):

```tsx
{/* Banner Carousel */}
{activeBanners.length > 0 && (
  <div className="relative overflow-hidden rounded-xl mb-6">
    <div
      className="flex transition-transform duration-500"
      style={{ transform: `translateX(-${currentBanner * 100}%)` }}
    >
      {activeBanners.map(banner => (
        <div key={banner.id} className="min-w-full">
          <img
            src={banner.image_url}
            alt={banner.title}
            className="w-full h-40 md:h-56 object-cover rounded-xl cursor-pointer"
            onClick={() => banner.link_url && window.open(banner.link_url, '_blank')}
          />
        </div>
      ))}
    </div>
    {/* Dot indicators */}
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
      {activeBanners.map((_, i) => (
        <button
          onClick={() => setCurrentBanner(i)}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === currentBanner ? 'bg-white' : 'bg-white/50'
          }`}
        />
      ))}
    </div>
  </div>
)}
```

Auto-advance tiap 5 detik dengan `setInterval`.

---

### Step 4.7 — Buat Component QuickAddButton

**File:** `src/app/components/QuickAddButton.tsx` (BARU)

```tsx
// Floating button "+" yang langsung add to cart
// Jika produk punya variant → buka modal pilih variant
// Jika tidak → langsung tambah ke cart
```

Props: `product: Product`
Logic:
1. Cek apakah product punya variants
2. Jika ada → buka bottom sheet/modal pilih variant + extra
3. Jika tidak → langsung `cart.addItem(...)` + toast "Ditambahkan ke keranjang"

---

## PHASE 5: ADMIN PANEL ENHANCEMENTS

Translate labels, tambah tab, banner management, notification management.

### Step 5.1 — Translate Admin Panel Labels ke Bahasa Indonesia

**File:** `src/app/pages/admin/AdminPanel.tsx`

```diff
  const navigationItems = [
-   { id: "dashboard", label: "Dashboard", icon: TrendingUp },
+   { id: "dashboard", label: "Dasbor", icon: TrendingUp },
-   { id: "orders", label: "Orders", icon: ShoppingBag },
+   { id: "orders", label: "Pesanan", icon: ShoppingBag },
-   { id: "finance", label: "Finance", icon: DollarSign },
+   { id: "finance", label: "Keuangan", icon: DollarSign },
-   { id: "drivers", label: "Drivers", icon: Users },
+   { id: "drivers", label: "Driver", icon: Users },
-   { id: "stores", label: "Outlets", icon: Store },
+   { id: "stores", label: "Outlet", icon: Store },
+   { id: "informasi", label: "Informasi", icon: Bell },
+   { id: "keuangan-driver", label: "Keuangan Driver", icon: Wallet },
  ];
```

Translate juga label di dalam konten setiap tab:

| Sebelum | Sesudah |
|---------|---------|
| Total Orders | Total Pesanan |
| Revenue | Pendapatan |
| Admin Profit | Keuntungan Admin |
| Assign Driver | Tugaskan Driver |
| Buat Invoice | Buat Nota |
| Admin Fee | Biaya Admin |
| Service Fee | Biaya Layanan |
| Order Terbaru | Pesanan Terbaru |
| Daftar Order | Daftar Pesanan |
| Buat Pesanan Manual | Buat Pesanan Manual (OK) |
| Manajemen Outlet | Manajemen Outlet (OK) |

---

### Step 5.2 — Translate Navbar Labels

**File:** `src/app/components/Navbar.tsx`

```diff
- Home
+ Beranda
- Order
+ Pesanan
- History
+ Riwayat
```

Ubah di kedua lokasi: desktop menu (line 62, 70, 78) dan mobile bottom nav (line 142, 156, 164).

---

### Step 5.3 — Translate FinanceDashboard Labels

**File:** `src/app/components/FinanceDashboard.tsx`

| Sebelum | Sesudah |
|---------|---------|
| Financial Dashboard | Dasbor Keuangan |
| Total Orders | Total Pesanan |
| Total Revenue | Total Pendapatan |
| Admin Profit | Keuntungan Admin |
| Driver Earnings | Pendapatan Driver |
| Export to Excel | Ekspor ke Excel |
| Income Over Time | Pendapatan dari Waktu ke Waktu |
| Orders Per Day | Pesanan Per Hari |
| Profit Breakdown | Rincian Keuntungan |
| Driver Statistics | Statistik Driver |
| Quick Reports | Laporan Cepat |
| Daily Report | Laporan Harian |
| Weekly Report | Laporan Mingguan |
| Monthly Report | Laporan Bulanan |
| Today | Hari Ini |
| This Week | Minggu Ini |
| This Month | Bulan Ini |
| Custom Range | Rentang Kustom |

---

### Step 5.4 — Buat Banner Management Component

**File:** `src/app/components/BannerManagement.tsx` (BARU)

Full CRUD untuk banners:

- List banners dengan thumbnail, title, status aktif/nonaktif, urutan
- Tambah banner: form dengan image upload (preview 1200x400), title, link_url (optional), toggle aktif, sort_order
- Edit banner: populate form dengan data existing
- Hapus banner: dengan ConfirmDialog
- Drag/sort untuk ubah urutan (opsional)

Storage: upload ke bucket `banner-images`.

---

### Step 5.5 — Buat Notification Management Component

**File:** `src/app/components/NotificationManagement.tsx` (BARU)

Form untuk buat notifikasi:
- Title
- Message (textarea)
- Type: info / promo / order / system
- Target: semua customer / customer tertentu (input nomor HP)
- Kirim button → insert ke tabel `notifications`

List riwayat notifikasi yang sudah dikirim dengan timestamp.

---

### Step 5.6 — Buat Driver Finance Management Component

**File:** `src/app/components/DriverFinanceManagement.tsx` (BARU)

- Tabel semua driver: nama, saldo, status aktif
- Riwayat transaksi per driver (dari `driver_financial_transactions`)
- Tombol "Tambah Saldo" → modal input amount + notes
- Tombol "Kurangi Saldo" → modal input amount + notes
- Tombol "Lihat Riwayat" → expand detail transaksi

---

### Step 5.7 — Integrasikan Tab "Informasi" dan "Keuangan Driver" di AdminPanel

**File:** `src/app/pages/admin/AdminPanel.tsx`

Tambahkan render untuk tab baru:

```tsx
{activeTab === "informasi" && (
  <Tabs defaultValue="banners">
    <TabsList>
      <TabsTrigger value="banners">Banner</TabsTrigger>
      <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
    </TabsList>
    <TabsContent value="banners"><BannerManagement /></TabsContent>
    <TabsContent value="notifications"><NotificationManagement /></TabsContent>
  </Tabs>
)}

{activeTab === "keuangan-driver" && <DriverFinanceManagement />}
```

---

### Step 5.8 — Tambah Best Seller & Recommended Toggle di Menu Form

**File:** `src/app/pages/admin/OutletMenuManagement.tsx`

Tambahkan di form menu, setelah toggle "Ketersediaan":

```tsx
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium">Best Seller</label>
    <p className="text-xs text-gray-500">Tandai sebagai menu terlaris</p>
  </div>
  <Switch
    checked={menuForm.is_best_seller}
    onCheckedChange={(val) => setMenuForm({ ...menuForm, is_best_seller: val })}
  />
</div>
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium">Rekomendasi</label>
    <p className="text-xs text-gray-500">Tampilkan di slider rekomendasi</p>
  </div>
  <Switch
    checked={menuForm.is_recommended}
    onCheckedChange={(val) => setMenuForm({ ...menuForm, is_recommended: val })}
  />
</div>
```

Update state `menuForm` default, insert/update payload agar menyertakan kedua field.

---

### Step 5.9 — Tambahkan Fitur Duplicate Menu

**File:** `src/app/pages/admin/OutletMenuManagement.tsx`

Tambah tombol "Duplikat" di setiap menu card (sebelah tombol Edit/Hapus):

```tsx
<button
  onClick={() => handleDuplicate(product)}
  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
  title="Duplikat Menu"
>
  <Copy className="w-4 h-4" />
</button>
```

Handler:

```typescript
const handleDuplicate = async (product: Product) => {
  const newMenu = {
    outlet_id: product.outlet_id,
    name: `${product.name} (Copy)`,
    price: product.price,
    discount_price: product.discount_price,
    description: product.description,
    category: product.category,
    image_url: product.image_url,
    is_available: product.is_available,
    is_best_seller: product.is_best_seller,
    is_recommended: product.is_recommended,
  };
  const newProduct = await addProduct(newMenu);

  // Duplicate variants
  const variants = getVariantsByProduct(product.id);
  for (const v of variants) {
    await addVariant({ product_id: newProduct.id, name: v.name, price_adjustment: v.price_adjustment });
  }

  // Duplicate extras
  const extras = getExtrasByProduct(product.id);
  for (const e of extras) {
    await addExtra({ product_id: newProduct.id, name: e.name, price: e.price });
  }

  toast.success("Menu berhasil diduplikat");
};
```

---

### Step 5.10 — Tampilkan Menu Images di Order Detail Admin

**File:** `src/app/pages/admin/AdminPanel.tsx`

Di order detail card, fetch `order_items` dan tampilkan gambar produk:

```tsx
{/* Order Items with Images */}
<div className="space-y-2 mb-4">
  {orderItemsMap[order.id]?.map(item => {
    const product = allProducts.find(p => p.id === item.product_id);
    return (
      <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
        {product?.image_url ? (
          <img src={product.image_url} className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm font-medium">{item.name} x{item.quantity}</div>
          {item.selected_variant && (
            <div className="text-xs text-gray-500">Varian: {item.selected_variant}</div>
          )}
        </div>
        <div className="text-sm font-medium">{formatCurrency(item.item_total)}</div>
      </div>
    );
  })}
</div>
```

Perlu tambahkan state `orderItemsMap` yang fetch order_items untuk setiap order.

---

## PHASE 6: DRIVER PANEL ENHANCEMENTS

### Step 6.1 — Tambahkan Online/Offline Toggle

**Files:** `src/app/pages/driver/DriverPanel.tsx`, Supabase Migration (tambah kolom `is_online` di `profiles`)

```sql
ALTER TABLE public.profiles ADD COLUMN is_online boolean DEFAULT false;
```

Di DriverPanel header:

```tsx
<div className="flex items-center gap-3">
  <span className="text-sm text-gray-600">{isOnline ? "Online" : "Offline"}</span>
  <Switch
    checked={isOnline}
    onCheckedChange={async (val) => {
      setIsOnline(val);
      await supabase.from('profiles').update({ is_online: val }).eq('id', driverId);
      toast.success(val ? "Status: Online" : "Status: Offline");
    }}
  />
  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
</div>
```

---

### Step 6.2 — Tambahkan WhatsApp Button untuk Customer

**File:** `src/app/pages/driver/DriverPanel.tsx`

Di order card dan active order view, tambahkan:

```tsx
<a
  href={`https://wa.me/${order.customer_phone?.replace(/^0/, '62')}`}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
>
  <MessageCircle className="w-4 h-4" />
  WhatsApp Customer
</a>
```

Tambahkan import `MessageCircle` dari lucide-react.

---

### Step 6.3 — Tambahkan Fitur Withdraw

**File:** `src/app/pages/driver/DriverPanel.tsx`

Tambahkan section setelah Saldo Deposit card:

```tsx
{driverBalance > MIN_BALANCE && (
  <Dialog>
    <DialogTrigger asChild>
      <button className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
        Tarik Saldo
      </button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Tarik Saldo</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Jumlah Penarikan</label>
          <Input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(Number(e.target.value))}
            max={driverBalance - MIN_BALANCE}
          />
          <p className="text-xs text-gray-500 mt-1">
            Maksimal: {formatCurrency(driverBalance - MIN_BALANCE)}
          </p>
        </div>
        <Button onClick={handleWithdraw} className="w-full">
          Konfirmasi Tarik
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
```

Handler: insert ke `driver_financial_transactions` dengan type `withdraw`, update `profiles.balance`.

---

### Step 6.4 — Block Order Jika Saldo < Minimum

**File:** `src/app/pages/driver/DriverPanel.tsx`

Di tombol "Mulai Pengiriman":

```tsx
<button
  onClick={() => handleAccept(order)}
  disabled={driverBalance < MIN_BALANCE}
  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
    driverBalance < MIN_BALANCE
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-orange-500 text-white hover:bg-orange-600'
  }`}
>
  {driverBalance < MIN_BALANCE ? (
    <>
      <AlertTriangle className="w-5 h-5" />
      <span>Saldo Tidak Mencukupi</span>
    </>
  ) : (
    <>
      <CheckCircle className="w-5 h-5" />
      <span>Mulai Pengiriman</span>
    </>
  )}
</button>
```

---

### Step 6.5 — Tambah Konfirmasi untuk Semua Status Change

**File:** `src/app/pages/driver/DriverPanel.tsx`

Tambahkan state `confirmAction` dan bungkus setiap handler:

```typescript
const [confirmAction, setConfirmAction] = useState<{
  title: string;
  description: string;
  onConfirm: () => void;
} | null>(null);
```

Setiap tombol status change:

```tsx
<button
  onClick={() => setConfirmAction({
    title: "Menuju Toko",
    description: "Konfirmasi bahwa Anda akan menuju ke toko pengambilan?",
    onConfirm: handleGoingToStore,
  })}
  className="..."
>
  Menuju Toko
</button>
```

Render ConfirmDialog:

```tsx
{confirmAction && (
  <ConfirmDialog
    open={true}
    onOpenChange={(open) => !open && setConfirmAction(null)}
    title={confirmAction.title}
    description={confirmAction.description}
    confirmText="Konfirmasi"
    cancelText="Batal"
    onConfirm={() => {
      confirmAction.onConfirm();
      setConfirmAction(null);
    }}
  />
)}
```

---

## PHASE 7: PAYMENT & TRACKING POLISH

### Step 7.1 — Tambah Pesan "Mohon Siapkan Uang Pas" untuk COD

**File:** `src/app/pages/customer/OrderTracking.tsx`

Tambahkan di bagian atas tracking page (setelah header):

```tsx
{order.payment_method === "cod" && order.status !== "completed" && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3"
  >
    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
      <DollarSign className="w-5 h-5 text-yellow-600" />
    </div>
    <div>
      <p className="font-medium text-yellow-800">Mohon siapkan uang pas</p>
      <p className="text-sm text-yellow-600">
        Total pembayaran: {formatCurrency(order.total)}
      </p>
    </div>
  </motion.div>
)}
```

---

### Step 7.2 — Tambah ETA di Tracking

**File:** `src/app/pages/customer/OrderTracking.tsx`

```tsx
const calculateETA = (status: string, distance: number): string => {
  const baseTime = 5; // menit
  const perKm = 2; // menit per km
  const totalMinutes = baseTime + Math.ceil(distance * perKm);

  const statusMultiplier: Record<string, number> = {
    'pending': 1.0,
    'processing': 0.8,
    'going-to-store': 0.6,
    'picked-up': 0.4,
    'on-delivery': 0.2,
  };

  const remaining = Math.ceil(totalMinutes * (statusMultiplier[status] || 0.5));
  return `~${remaining} menit lagi`;
};

// Render:
<div className="flex items-center gap-2 text-sm text-gray-600">
  <Clock className="w-4 h-4" />
  <span>Estimasi tiba: {calculateETA(order.status, order.distance)}</span>
</div>
```

---

### Step 7.3 — Tambah Status "Driver Ditugaskan"

**Files:** Supabase Migration, `src/lib/database.types.ts`, semua file yang reference `statusLabels`

```sql
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'driver_assigned'::text,
    'processing'::text,
    'going-to-store'::text,
    'picked-up'::text,
    'on-delivery'::text,
    'completed'::text
  ]));
```

Update `statusLabels` di semua panel:

```typescript
const statusLabels: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  "driver_assigned": "Driver Ditugaskan",   // <-- BARU
  processing: "Diproses",
  "going-to-store": "Menuju Toko",
  "picked-up": "Pesanan Diambil",
  "on-delivery": "Dalam Perjalanan",
  completed: "Selesai",
};
```

Update flow: `pending` → `driver_assigned` (saat admin assign driver) → `processing` (saat driver mulai) → ...

Ubah `handleAssignDriver` di AdminPanel:
```diff
- await assignDriver(orderId, driverId, driver.name);
+ await assignDriver(orderId, driverId, driver.name);
+ await updateOrder(orderId, { status: 'driver_assigned' });
```

---

### Step 7.4 — Tambah Handling "Menunggu Pembayaran" di Tracking

**File:** `src/app/pages/customer/OrderTracking.tsx`

```tsx
{order.payment_method === "transfer" && order.payment_status === "pending" && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
      <CreditCard className="w-5 h-5 text-blue-600" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-blue-800">Menunggu Pembayaran</p>
      <p className="text-sm text-blue-600">Silakan lakukan pembayaran untuk melanjutkan pesanan</p>
    </div>
    <button
      onClick={() => navigate(`/home/payment/${order.id}`)}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
    >
      Bayar
    </button>
  </div>
)}
```

---

## PHASE 8: CONFIRMATION MODALS (GLOBAL)

Semua aksi penting harus punya konfirmasi modal.

### Step 8.1 — Pola Konfirmasi yang Konsisten

**Files:** Multiple

Tambahkan pattern `confirmAction` state di setiap panel yang butuh konfirmasi:

```typescript
const [confirmAction, setConfirmAction] = useState<{
  title: string;
  description: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
} | null>(null);
```

Daftar aksi yang perlu ConfirmDialog:

| Aksi | File | Variant |
|------|------|---------|
| Simpan Outlet (baru) | `AdminPanel.tsx` | default |
| Simpan Outlet (edit) | `AdminPanel.tsx` | default |
| Hapus Outlet | `AdminPanel.tsx` | destructive |
| Simpan Menu (baru) | `OutletMenuManagement.tsx` | default |
| Simpan Menu (edit) | `OutletMenuManagement.tsx` | default |
| Hapus Menu | `OutletMenuManagement.tsx` | destructive |
| Verifikasi Pembayaran (terima) | `AdminPanel.tsx` | default |
| Verifikasi Pembayaran (tolak) | `AdminPanel.tsx` | destructive |
| Tugaskan Driver | `AdminPanel.tsx` | default |
| Logout Admin | `AdminPanel.tsx` | default (sudah ada) |
| Logout Driver | `DriverPanel.tsx` | default |
| Status Change: Menuju Toko | `DriverPanel.tsx` | default |
| Status Change: Ambil Pesanan | `DriverPanel.tsx` | default |
| Status Change: Mulai Pengiriman | `DriverPanel.tsx` | default |
| Status Change: Selesaikan | `DriverPanel.tsx` | default |
| Tarik Saldo | `DriverPanel.tsx` | default |
| Hapus Banner | `BannerManagement.tsx` | destructive |
| Logout Customer (dengan active order) | `Navbar.tsx` | destructive |

---

## PHASE 9: IMAGE & UPLOAD SYSTEM

### Step 9.1 — Tambah Driver Photo Upload

**File:** `src/app/components/DriverManagement.tsx`

Di form tambah/edit driver, tambahkan:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Foto Driver</label>
  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
    {driverPhotoPreview ? (
      <div className="relative inline-block">
        <img src={driverPhotoPreview} className="w-24 h-24 rounded-full object-cover mx-auto" />
        <button
          onClick={() => { setDriverPhotoFile(null); setDriverPhotoPreview(null); }}
          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    ) : (
      <label className="cursor-pointer">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Klik untuk upload foto</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleDriverPhotoChange}
          className="hidden"
        />
      </label>
    )}
  </div>
</div>
```

Upload ke bucket `driver-photos`, simpan URL di `profiles.photo_url`.

---

### Step 9.2 — Tambah Logo SiAnter di Invoice Header

**File:** `src/app/components/InvoiceModal.tsx`

Tambahkan logo di bagian paling atas invoice (baik customer maupun outlet):

```tsx
<div className="text-center border-b pb-3 mb-3">
  <Logo size="sm" />
  <div className="font-bold text-sm mt-1">SiAnter</div>
  <div className="text-[10px] text-gray-500">Layanan Antar Cepat & Terpercaya</div>
</div>
```

Pastikan import `Logo` component sudah ada.

---

### Step 9.3 — Credential Modal: Print & Share WhatsApp

**File:** `src/app/components/DriverManagement.tsx`

Di modal credential (setelah tombol Copy), tambahkan:

```tsx
<div className="flex gap-2 mt-4">
  <button
    onClick={handlePrintCredentials}
    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
  >
    <Printer className="w-4 h-4" />
    Print
  </button>
  <button
    onClick={handleShareWhatsApp}
    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
  >
    <MessageCircle className="w-4 h-4" />
    Kirim via WhatsApp
  </button>
</div>
```

Handler:

```typescript
const handlePrintCredentials = () => {
  const printContent = `
    Kredensial Driver SiAnter
    ========================
    Nama: ${newDriverCredentials.name}
    Email: ${newDriverCredentials.email}
    Password: ${newDriverCredentials.password}
    ========================
  `;
  const printWindow = window.open('', '_blank');
  printWindow?.document.write(`<pre>${printContent}</pre>`);
  printWindow?.document.close();
  printWindow?.print();
};

const handleShareWhatsApp = () => {
  const text = encodeURIComponent(
    `Kredensial Driver SiAnter\n\nNama: ${newDriverCredentials.name}\nEmail: ${newDriverCredentials.email}\nPassword: ${newDriverCredentials.password}\n\nSilakan login di aplikasi SiAnter.`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
};
```

---

### Step 9.4 — Pastikan Cart Item Menyimpan Image

**File:** `src/app/pages/customer/StoreDetail.tsx` (saat add to cart)

Pastikan `addItem` menerima `imageUrl`:

```diff
  addItem({
    productId: product.id,
    name: product.name,
    price: finalPrice,
    quantity: 1,
    selectedVariant: selectedVariant,
    selectedExtras: selectedExtras,
    outletId: outlet.id,
    outletName: outlet.name,
+   imageUrl: product.image_url,
  });
```

Pastikan `CartContext.CartItem` interface memiliki field `imageUrl: string | null`.

---

## PHASE 10: FINISHING & POLISH

### Step 10.1 — Tambahkan Error Boundary

**File:** `src/app/App.tsx`

```tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

<ErrorBoundary fallback={<div>Terjadi kesalahan. Silakan muat ulang halaman.</div>}>
  <RouterProvider router={router} />
</ErrorBoundary>
```

**File:** `src/app/components/ErrorBoundary.tsx` (BARU) — React class component dengan `componentDidCatch`.

---

### Step 10.2 — Pagination untuk Orders

**File:** `src/app/contexts/DataContext.tsx`

Tambahkan limit/offset ke fetch orders untuk skalabilitas:

```typescript
const PAGE_SIZE = 50;

const fetchOrders = async (page: number = 0) => {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  // ...
};
```

---

### Step 10.3 — Tambahkan Validasi Form yang Lebih Baik

**Files:** `Checkout.tsx`, `KirimBarang.tsx`, `AdminPanel.tsx`, `OutletMenuManagement.tsx`

Ganti `alert()` dengan inline error messages dan toast. Tambahkan validasi:
- Nomor HP harus angka, minimal 10 digit
- Nama tidak boleh kosong
- Harga harus angka positif
- Desa harus dipilih

---

### Step 10.4 — Driver Panel Logout dengan Konfirmasi

**File:** `src/app/pages/driver/DriverPanel.tsx:158`

Ganti `onClick={logout}`:

```diff
- <button onClick={logout} className="...">
+ const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
+
+ <button onClick={() => setShowLogoutConfirm(true)} className="...">
    <LogOut className="w-4 h-4" />
    <span className="hidden sm:inline">Logout</span>
  </button>
+
+ <ConfirmDialog
+   open={showLogoutConfirm}
+   onOpenChange={setShowLogoutConfirm}
+   title="Konfirmasi Logout"
+   description="Apakah Anda yakin ingin logout?"
+   confirmText="Ya, Logout"
+   cancelText="Batal"
+   onConfirm={async () => { await logout(); navigate("/login-driver"); }}
+ />
```

---

## URUTAN EKSEKUSI

```
Phase 1  (Database)             → Harus dulu, semua bergantung padanya
  ↓
Phase 2  (Bug Fixes)            → Fix yang sudah rusak dulu
  ↓
Phase 3  (Realtime)             → Foundation real-time
  ↓
Phase 4  (Customer Home)        → Fitur customer utama (category, recommendation, best seller, banner)
  ↓
Phase 5  (Admin Panel)          → Label + tab baru + menu CRUD tambahan
  ↓
Phase 6  (Driver Panel)         → Online/offline, WhatsApp, withdraw, block order
  ↓
Phase 7  (Payment & Tracking)   → Polish payment flow, ETA, status baru
  ↓
Phase 8  (Confirmation Modals)  → Konfirmasi di semua aksi penting
  ↓
Phase 9  (Image & Upload)       → Driver photo, logo invoice, credential print/share
  ↓
Phase 10 (Finishing)            → Error boundary, pagination, validasi form
```

---

## FILE INVENTORY

### File Baru (8)
| File | Kegunaan |
|------|----------|
| `src/lib/realtime.ts` | Realtime subscription helper |
| `src/app/components/BannerManagement.tsx` | CRUD banner admin |
| `src/app/components/NotificationManagement.tsx` | CRUD notifikasi admin |
| `src/app/components/DriverFinanceManagement.tsx` | Keuangan driver admin |
| `src/app/components/QuickAddButton.tsx` | Tombol add-to-cart cepat |
| `src/app/components/BannerCarousel.tsx` | Carousel banner customer |
| `src/app/components/ErrorBoundary.tsx` | Error boundary wrapper |
| `src/app/components/CustomerNotifications.tsx` | Panel notifikasi customer |

### File Existing Diubah (15)
| File | Perubahan |
|------|-----------|
| `src/lib/database.types.ts` | Tambah type untuk tabel baru + kolom baru |
| `src/app/contexts/DataContext.tsx` | Realtime subscriptions, driver balance 100k, order items fetch |
| `src/app/contexts/NotificationContext.tsx` | Realtime subscription ke notifications table |
| `src/app/contexts/CartContext.tsx` | localStorage persistence |
| `src/app/components/Navbar.tsx` | Fix customer_name bug, translate labels |
| `src/app/components/FinanceDashboard.tsx` | Translate labels |
| `src/app/components/InvoiceModal.tsx` | Tambah logo |
| `src/app/components/DriverManagement.tsx` | Photo upload, credential print/share |
| `src/app/components/ConfirmDialog.tsx` | (tidak diubah, sudah OK) |
| `src/app/routes.tsx` | Route guards |
| `src/app/pages/customer/Home.tsx` | Category grid, recommendation, best seller, banner, menu pilihan |
| `src/app/pages/customer/History.tsx` | Fix "Pesan Lagi" button |
| `src/app/pages/customer/Checkout.tsx` | Ganti alert dengan toast |
| `src/app/pages/customer/OrderTracking.tsx` | ETA, COD message, realtime |
| `src/app/pages/admin/AdminPanel.tsx` | Translate labels, tab baru, konfirmasi modal, menu image di order |
| `src/app/pages/admin/OutletMenuManagement.tsx` | Best seller/recommended toggle, duplicate menu |
| `src/app/pages/driver/DriverPanel.tsx` | Online/offline, WhatsApp, withdraw, block order, konfirmasi |

### Supabase Migrations (6)
| Migration | Perubahan |
|-----------|-----------|
| `add_best_seller_recommended_to_products` | Kolom baru di products |
| `create_banners_table` | Tabel banners + RLS |
| `create_notifications_table` | Tabel notifications + RLS |
| `create_driver_financial_transactions_table` | Tabel transaksi driver + RLS |
| `add_photo_url_to_profiles` | Kolom photo_url di profiles |
| `add_is_online_to_profiles` | Kolom is_online di profiles |
| `update_orders_status_constraint` | Tambah driver_assigned ke status CHECK |
