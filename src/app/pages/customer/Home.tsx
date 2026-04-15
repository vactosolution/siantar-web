import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Search, ShoppingBag, Package, Coffee, MapPin, Truck, X, Store, ImageIcon, Loader2, Star, Clock, DoorOpen, DoorClosed, ArrowRight } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { BannerCarousel } from "../../components/BannerCarousel";
import { supabase } from "../../../lib/supabase";
import type { Tables } from "../../../lib/database.types";
import { isOutletCurrentlyOpen, getNextOpenTime } from "../../utils/scheduleUtils";

type Banner = Tables<"banners">;

const foodCategories = [
  { id: "Nasi Goreng & Mie Goreng", label: "Makanan", icon: "🍚" },
  { id: "Kopi & Teh", label: "Minuman", icon: "🥤" },
  { id: "Snack", label: "Snack", icon: "🍟" },
  { id: "Sambal", label: "Sambal", icon: "🌶" },
  { id: "Sayur", label: "Sayur", icon: "🥬" },
  { id: "Lain-lain", label: "Lain-lain", icon: "🛒" },
];

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderNotification, setShowOrderNotification] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const { orders, outlets, loadingOutlets, getProductsByOutlet, products } = useData();
  const { customerPhone } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBanners = async () => {
      const { data: bannerData } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order");
      if (bannerData) setBanners(bannerData);
    };
    fetchBanners();
  }, []);

  const allCategories = outlets
    .filter(o => o.is_active !== false) // Show all active outlets in category list
    .map((o) => o.category)
    .filter((v, i, a) => a.indexOf(v) === i);

  // Normalize phone for comparison (08... <=> 628...)
  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("08")) return "628" + digits.slice(1);
    if (digits.startsWith("8") && !digits.startsWith("62")) return "628" + digits;
    return digits;
  };

  // Get active orders belonging to the current customer only
  // Only show orders that are NOT cancelled and NOT completed
  const activeOrders = customerPhone
    ? orders.filter(
        order =>
          order.status !== "completed" &&
          order.status !== "cancelled" &&
          normalizePhone(order.customer_phone) === normalizePhone(customerPhone)
      )
    : [];
  const latestActiveOrder = activeOrders[0];

  // Filter outlets based on category and search
  const filteredOutlets = outlets.filter((outlet) => {
    const matchesCategory =
      selectedCategory === null || outlet.category === selectedCategory;
    const matchesSearch =
      outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const recommendedProducts = products.filter((p) => p.is_recommended && p.is_available);
  const bestSellerProducts = products.filter((p) => p.is_best_seller && p.is_available);
  const allProducts = products.filter((p) => p.is_available);

  // Category mapping for display
  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case "makanan": return "Makanan";
      case "minuman": return "Minuman";
      case "snack": return "Snack";
      case "sambal": return "Sambal";
      case "sayur": return "Sayur";
      case "lain-lain": return "Lain-lain";
      default: return category;
    }
  };

  return (
    <div className="pb-20 md:pb-8">
      {/* Active Order Notification */}
      <AnimatePresence>
        {latestActiveOrder && showOrderNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white sticky top-16 z-40 shadow-md"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Pesanan Aktif</p>
                    <p className="text-sm text-orange-100">
                      Order #{latestActiveOrder.id} sedang diproses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/home/tracking/${latestActiveOrder.id}`)}
                    className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium text-sm"
                  >
                    Lacak
                  </button>
                  <button
                    onClick={() => setShowOrderNotification(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner Carousel */}
        <BannerCarousel banners={banners} />

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 sm:p-8 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Mau pesan apa hari ini?
          </h1>
          <p className="text-gray-300 mb-6">
            Tinggal pilih outlet, langsung dianter
          </p>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white w-5 h-5" />
            <input
              type="text"
              placeholder="Cari outlet, menu, atau kategori"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border-2 border-orange-500/30 text-white placeholder-white/60 caret-white focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white/15 transition-all text-sm sm:text-base font-medium"
            />
          </div>
        </div>

        {/* Services Section (#61) */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Layanan Kami</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {/* Pesan Makanan (Active) */}
            <div className="min-w-[160px] flex-shrink-0 bg-white p-4 rounded-xl border-2 border-orange-500 shadow-lg relative overflow-hidden group cursor-pointer">
              <div className="bg-orange-100 p-3 rounded-xl mb-3 inline-block">
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-900">Pesan Makanan</h3>
              <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">Aktif</p>
            </div>

            {/* SiAnter Sehat (Coming Soon) */}
            <div className="min-w-[160px] flex-shrink-0 bg-white p-4 rounded-xl border border-gray-100 shadow-sm opacity-60 cursor-not-allowed group">
              <div className="bg-green-50 p-3 rounded-xl mb-3 inline-block">
                <span className="text-2xl">💚</span>
              </div>
              <h3 className="font-bold text-gray-900">SiAnter Sehat</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Segera Hadir</p>
              <div className="absolute top-2 right-2">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Antar Barang (Coming Soon) */}
            <div className="min-w-[160px] flex-shrink-0 bg-white p-4 rounded-xl border border-gray-100 shadow-sm opacity-60 cursor-not-allowed group">
              <div className="bg-gray-50 p-3 rounded-xl mb-3 inline-block">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900">Antar Barang</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Gak Tersedia</p>
              <div className="absolute top-2 right-2">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Category Slider (#60) */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Kategori</h2>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {foodCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full border-2 whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-orange-500 border-orange-500 text-white shadow-md"
                    : "bg-white border-transparent shadow-sm hover:border-orange-200 text-gray-700"
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recommendation Slider */}
        {recommendedProducts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Rekomendasi Untuk Kamu</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {recommendedProducts.map((product) => {
                const outlet = outlets.find((o) => o.id === product.outlet_id);
                return (
                  <div
                    key={product.id}
                    className="min-w-[200px] bg-white rounded-2xl shadow-sm overflow-hidden flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                    onClick={() => navigate(`/home/store/${product.outlet_id}`)}
                  >
                    {product.image_url ? (
                      <img src={product.image_url} className="w-full h-32 object-cover" alt={product.name} />
                    ) : (
                      <div className="w-full h-32 bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-gray-900 truncate mb-1">{product.name}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{outlet?.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-orange-600 font-extrabold text-sm">
                          {(() => {
                            const isMarkupEnabled = product.markup_enabled !== null 
                              ? product.markup_enabled 
                              : (outlet?.markup_enabled !== false);
                            const markup = isMarkupEnabled ? 1000 : 0;
                            return formatCurrency((product.discount_price || product.price) + markup);
                          })()}
                        </p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-[10px] font-bold text-gray-700">4.5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Best Seller Section */}
        {bestSellerProducts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">⭐ Best Seller</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bestSellerProducts.map((product) => {
                const outlet = outlets.find((o) => o.id === product.outlet_id);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden relative cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                    onClick={() => navigate(`/home/store/${product.outlet_id}`)}
                  >
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-sm">
                      Best Seller
                    </div>
                    {product.image_url ? (
                      <img src={product.image_url} className="w-full h-32 object-cover" alt={product.name} />
                    ) : (
                      <div className="w-full h-32 bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-gray-900 truncate mb-1">{product.name}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{outlet?.name}</p>
                      <p className="text-orange-600 font-extrabold text-sm">
                        {(() => {
                          const isMarkupEnabled = product.markup_enabled !== null 
                            ? product.markup_enabled 
                            : (outlet?.markup_enabled !== false);
                          const markup = isMarkupEnabled ? 1000 : 0;
                          return formatCurrency((product.discount_price || product.price) + markup);
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Outlet List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Pilih Outlet</h2>
          <p className="text-sm text-gray-500 mt-1">
            {outlets.length === 0
              ? "Belum ada outlet yang terdaftar"
              : `${filteredOutlets.length} outlet terdaftar`}
          </p>
        </div>

        {/* Loading State */}
        {loadingOutlets ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : outlets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <Store className="w-16 h-16 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Belum ada outlet yang terdaftar
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Saat ini belum ada outlet yang tersedia.
            </p>
          </motion.div>
        ) : filteredOutlets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-100"
          >
            <div className="bg-orange-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Store className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {selectedCategory === "Lain-lain" ? "Belum ada menu pada kategori ini" : "Tidak ada outlet yang ditemukan"}
            </h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm">
              {selectedCategory === "Lain-lain" 
                ? "Kategori ini masih dalam pengembangan atau belum tersedia saat ini."
                : "Coba gunakan kata kunci lain atau hapus filter kategori."}
            </p>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="mt-6 text-sm font-bold text-orange-600 px-6 py-2 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors"
              >
                Lihat Semua Outlet
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutlets.map((outlet, index) => {
              const isOpen = isOutletCurrentlyOpen(outlet);
              return (
                <motion.div
                  key={outlet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/home/store/${outlet.id}`}
                    className={`block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-orange-200 ${!isOpen ? 'grayscale-[0.5]' : ''}`}
                  >
                    <div className="aspect-video overflow-hidden bg-gray-50 relative">
                      {outlet.image_url ? (
                        <img
                          src={outlet.image_url}
                          alt={outlet.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : null}
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm tracking-wider ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                          {isOpen ? <DoorOpen className="w-3 h-3" /> : <DoorClosed className="w-3 h-3" />}
                          {isOpen ? 'BUKA' : 'TUTUP'}
                        </span>
                      </div>

                      <div 
                        className={`absolute inset-0 flex flex-col items-center justify-center ${outlet.image_url ? 'hidden' : 'flex'}`}
                      >
                        <ImageIcon className="w-10 h-10 text-gray-200" />
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md text-gray-900 rounded-full text-[10px] font-black shadow-sm border border-white/20">
                          {getCategoryLabel(outlet.category).toUpperCase()}
                        </span>
                      </div>
                      
                      {!isOpen && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-white/20">
                            <p className="text-[10px] font-black text-gray-900 tracking-tight uppercase">{getNextOpenTime(outlet)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-600 transition-colors leading-tight">
                          {outlet.name}
                        </h3>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-500">
                          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <span className="text-xs font-medium">{outlet.village}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-gray-700">4.5</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">15-25 menit</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{getProductsByOutlet(outlet.id).length} menu</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isOpen ? 'Pesan Sekarang' : 'Cek Jadwal'}</span>
                        <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Menu Pilihan Section */}
      {allProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Menu Pilihan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {allProducts.slice(0, 6).map((product) => {
              const outlet = outlets.find((o) => o.id === product.outlet_id);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/home/store/${product.outlet_id}`)}
                  className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                >
                  {product.image_url ? (
                    <img src={product.image_url} className="w-full h-32 object-cover" alt={product.name} />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                   <div className="p-3">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{outlet?.name}</p>
                    <p className="text-orange-600 font-bold text-sm">
                      {(() => {
                        const isMarkupEnabled = product.markup_enabled !== null 
                          ? product.markup_enabled 
                          : (outlet?.markup_enabled !== false);
                        const markup = isMarkupEnabled ? 1000 : 0;
                        const finalPrice = (product.discount_price || product.price) + markup;
                        const originalPriceWithMarkup = product.price + markup;

                        return (
                          <>
                            {product.discount_price ? (
                              <span className="line-through text-gray-400 text-xs mr-1">
                                {formatCurrency(originalPriceWithMarkup)}
                              </span>
                            ) : null}
                            {formatCurrency(finalPrice)}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}
