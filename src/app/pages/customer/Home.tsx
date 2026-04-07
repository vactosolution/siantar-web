import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Search, ShoppingBag, Package, Coffee, MapPin, Truck, X, Store, ImageIcon, Loader2, Star, Clock } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { BannerCarousel } from "../../components/BannerCarousel";
import { supabase } from "../../../lib/supabase";
import type { Tables } from "../../../lib/database.types";

type Banner = Tables<"banners">;

const foodCategories = [
  { id: "Nasi Goreng & Mie Goreng", label: "Nasgor", icon: "🍚" },
  { id: "Bakso & Mie Ayam", label: "Bakso", icon: "🍜" },
  { id: "Ayam Bakar & Ayam Goreng", label: "Ayam", icon: "🍗" },
  { id: "Kopi & Teh", label: "Kopi", icon: "☕" },
  { id: "Sate & Grill", label: "Sate", icon: "🍢" },
  { id: "Soto & Sop", label: "Soto", icon: "🍲" },
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
    .filter(o => o.is_open !== false) // Only show outlets that are open
    .map((o) => o.category)
    .filter((v, i, a) => a.indexOf(v) === i);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const visibleCategories = showAllCategories ? allCategories : foodCategories.slice(0, 6);
  const hasMore = allCategories.length > 6;

  // Normalize phone for comparison (08... <=> 628...)
  const normalizePhone = (phone: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("08")) return "628" + digits.slice(1);
    if (digits.startsWith("8") && !digits.startsWith("62")) return "628" + digits;
    return digits;
  };

  // Get active orders belonging to the current customer only
  const activeOrders = customerPhone
    ? orders.filter(
        order =>
          order.status !== "completed" &&
          normalizePhone(order.customer_phone) === normalizePhone(customerPhone)
      )
    : [];
  const latestActiveOrder = activeOrders[0];

  // Filter outlets based on category and search
  const filteredOutlets = outlets.filter((outlet) => {
    const isOpen = outlet.is_open !== false; // Default true if null/undefined
    const matchesCategory =
      selectedCategory === null || outlet.category === selectedCategory;
    const matchesSearch =
      outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.category.toLowerCase().includes(searchQuery.toLowerCase());
    return isOpen && matchesCategory && matchesSearch;
  });

  const recommendedProducts = products.filter((p) => p.is_recommended && p.is_available);
  const bestSellerProducts = products.filter((p) => p.is_best_seller && p.is_available);
  const allProducts = products.filter((p) => p.is_available);

  // Category mapping for display
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "food": return "Makanan";
      case "drink": return "Minuman";
      case "package": return "Paket";
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
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white"
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
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Mau pesan apa hari ini?
          </h1>
          <p className="text-gray-300 mb-4">
            Tinggal pilih outlet, langsung dianter
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari outlet, lokasi, atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Category Grid 3x2 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Kategori</h2>
          <div className="grid grid-cols-3 gap-3">
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-orange-50 border-orange-300"
                    : "bg-white border-transparent shadow-sm hover:shadow-md hover:border-orange-300"
                }`}
              >
                <span className="text-3xl mb-2">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-700 truncate w-full text-center">{cat.label}</span>
              </button>
            ))}
            {hasMore && !showAllCategories && (
              <button
                onClick={() => setShowAllCategories(true)}
                className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-300 transition-all"
              >
                <span className="text-3xl mb-2">⋯</span>
                <span className="text-xs font-medium text-gray-500">Lainnya</span>
              </button>
            )}
          </div>
        </section>

        {/* Recommendation Slider */}
        {recommendedProducts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Rekomendasi Untuk Kamu</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {recommendedProducts.map((product) => {
                const outlet = outlets.find((o) => o.id === product.outlet_id);
                return (
                  <div
                    key={product.id}
                    className="min-w-[200px] bg-white rounded-xl shadow-sm overflow-hidden flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/home/store/${product.outlet_id}`)}
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
                        <span className="line-through text-gray-400 text-xs mr-1">
                          {formatCurrency((product.discount_price || product.price) + 3000)}
                        </span>
                        {formatCurrency((product.discount_price || product.price) + 1000)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-500">4.5</span>
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
            <h2 className="text-lg font-bold text-gray-900 mb-3">⭐ Best Seller</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {bestSellerProducts.map((product) => {
                const outlet = outlets.find((o) => o.id === product.outlet_id);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden relative cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/home/store/${product.outlet_id}`)}
                  >
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full z-10">
                      ⭐ Best Seller
                    </div>
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
                        <span className="line-through text-gray-400 text-xs mr-1">
                          {formatCurrency((product.discount_price || product.price) + 3000)}
                        </span>
                        {formatCurrency((product.discount_price || product.price) + 1000)}
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
          <p className="text-sm text-gray-600 mt-1">
            {outlets.length === 0
              ? "Belum ada outlet yang terdaftar"
              : `${filteredOutlets.length} outlet tersedia${outlets.filter(o => !o.is_open).length > 0 ? ` (${outlets.filter(o => !o.is_open).length} tutup)` : ""}`}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <Search className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Tidak ada outlet yang ditemukan
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Coba ubah filter atau kata kunci pencarian Anda
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOutlets.map((outlet, index) => (
              <motion.div
                key={outlet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/home/store/${outlet.id}`}
                  className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-orange-200"
                >
                  <div className="aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative">
                    {outlet.image_url ? (
                      <img
                        src={outlet.image_url}
                        alt={outlet.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : null}
                    <div 
                      className={`absolute inset-0 flex flex-col items-center justify-center ${outlet.image_url ? 'hidden' : 'flex'}`}
                    >
                      <div className="bg-white/80 backdrop-blur-sm rounded-full p-6 mb-3">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full">
                        Belum ada gambar
                      </p>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-orange-600 rounded-full text-sm font-medium shadow-sm">
                        {outlet.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-orange-600 transition-colors">
                      {outlet.name}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="text-sm">{outlet.village}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="text-sm">{getProductsByOutlet(outlet.id).length} menu tersedia</span>
                      </div>
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
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Lihat Menu</span>
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white group-hover:bg-orange-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
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
                      <span className="line-through text-gray-400 text-xs mr-1">
                        {formatCurrency((product.discount_price || product.price) + 3000)}
                      </span>
                      {formatCurrency((product.discount_price || product.price) + 1000)}
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
