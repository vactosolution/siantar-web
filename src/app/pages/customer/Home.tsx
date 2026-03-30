import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Clock, ShoppingBag, Package, Coffee, MapPin, Truck, X, Store, ImageIcon } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import { motion, AnimatePresence } from "motion/react";

const categories = [
  { id: "all", label: "Semua", icon: null },
  { id: "food", label: "Makanan", icon: ShoppingBag },
  { id: "drink", label: "Minuman", icon: Coffee },
  { id: "package", label: "Paket", icon: Package },
];

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderNotification, setShowOrderNotification] = useState(true);
  const { orders, outlets } = useData();
  const navigate = useNavigate();

  // Get active orders (not completed)
  const activeOrders = orders.filter(order => order.status !== "completed");
  const latestActiveOrder = activeOrders[0];

  // Filter outlets based on category and search
  const filteredOutlets = outlets.filter((outlet) => {
    const matchesCategory =
      selectedCategory === "all" || outlet.category === selectedCategory;
    const matchesSearch =
      outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Mau pesan apa hari ini?
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8">
              Tinggal pilih outlet, langsung dianter
            </p>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari outlet, lokasi, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Outlet List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pilih Outlet</h2>
          <p className="text-gray-600 mt-1">
            {outlets.length === 0 
              ? "Belum ada outlet yang terdaftar"
              : `${filteredOutlets.length} outlet tersedia`}
          </p>
        </div>

        {/* Empty State - No Outlets at All */}
        {outlets.length === 0 ? (
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
              Saat ini belum ada outlet yang tersedia. Silakan hubungi admin untuk menambahkan outlet.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg">
              <Store className="w-5 h-5" />
              <span>Outlet akan muncul di sini</span>
            </div>
          </motion.div>
        ) : filteredOutlets.length === 0 ? (
          /* Empty State - No Results from Search/Filter */
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
          /* Outlet Cards */
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
                  {/* Outlet Image/Placeholder */}
                  <div className="aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative">
                    {outlet.image ? (
                      <img
                        src={outlet.image}
                        alt={outlet.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          // If image fails to load, show placeholder
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.nextElementSibling;
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    {/* Image Fallback */}
                    <div 
                      className={`absolute inset-0 flex flex-col items-center justify-center ${outlet.image ? 'hidden' : 'flex'}`}
                    >
                      <div className="bg-white/80 backdrop-blur-sm rounded-full p-6 mb-3">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full">
                        Belum ada gambar
                      </p>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-orange-600 rounded-full text-sm font-medium shadow-sm">
                        {getCategoryLabel(outlet.category)}
                      </span>
                    </div>
                  </div>

                  {/* Outlet Info */}
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
                        <span className="text-sm">{outlet.menuCount || 0} menu tersedia</span>
                      </div>
                    </div>

                    {/* Call to Action */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Lihat Menu
                        </span>
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
    </div>
  );
}
