import { useParams, Link } from "react-router";
import { ArrowLeft, MapPin, Plus, ShoppingCart, ImageIcon, Loader2 } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useData } from "../../contexts/DataContext";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { ProductVariant, ProductExtra, ProductWithDetails } from "../../contexts/DataContext";

export function StoreDetail() {
  const { storeId } = useParams<{ storeId: string }>();
  const { addItem, items } = useCart();
  const { outlets, getProductsByOutlet, loadingProducts } = useData();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedExtras, setSelectedExtras] = useState<Record<string, string[]>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const outlet = outlets.find((o) => o.id === storeId);
  const outletProducts = storeId ? getProductsByOutlet(storeId) : [];

  // Get unique categories from products
  const categories = Array.from(new Set(outletProducts.map((p) => p.category)));

  // Filter products by active category
  const filteredProducts = activeCategory
    ? outletProducts.filter((p) => p.category === activeCategory)
    : outletProducts;

  if (!outlet || !storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-500 mb-4">Outlet tidak ditemukan</p>
          <Link
            to="/home"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const getProductCartQuantity = (product: ProductWithDetails) => {
    const variantId = selectedVariants[product.id];
    const extraIds = (selectedExtras[product.id] || []).sort();
    return items
      .filter((item) => {
        if (item.productId !== product.id) return false;
        if (item.selectedVariant?.id !== (variantId || undefined)) return false;
        const itemExtraIds = item.selectedExtras.map((e) => e.id).sort();
        return JSON.stringify(itemExtraIds) === JSON.stringify(extraIds);
      })
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const calculateProductPrice = (product: ProductWithDetails) => {
    // Base price (use discount if available)
    let basePrice = product.discount_price ?? product.price;
    
    // Apply markup only if product.markup_enabled is true
    const productMarkup = (product as any).markup_enabled !== false ? 1000 : 0;
    let price = basePrice + productMarkup;

    const variantId = selectedVariants[product.id];
    if (variantId) {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) price += variant.price_adjustment;
    }

    const extraIds = selectedExtras[product.id] || [];
    extraIds.forEach((extraId) => {
      const extra = product.extras?.find((e) => e.id === extraId);
      if (extra) price += extra.price;
    });

    return price;
  };

  const handleAddToCart = (product: ProductWithDetails) => {
    try {
      const variantId = selectedVariants[product.id];
      const selectedVariant = variantId
        ? product.variants?.find((v) => v.id === variantId)
        : undefined;

      const extraIds = selectedExtras[product.id] || [];
      const productExtras = extraIds
        .map((id) => product.extras?.find((e) => e.id === id))
        .filter((e): e is ProductExtra => !!e);

      // Apply markup at product level
      const productMarkup = (product as any).markup_enabled !== false ? 1000 : 0;
      const basePrice = (product.discount_price ?? product.price) + productMarkup;

      addItem({
        productId: product.id,
        name: product.name,
        basePrice,
        selectedVariant,
        selectedExtras: productExtras,
        price: calculateProductPrice(product),
        outletId: storeId,
        outletName: outlet.name,
        imageUrl: product.image_url,
      });

      toast.success(`${product.name} ditambahkan ke keranjang`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{outlet.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{outlet.village}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Menu</h2>

        {/* Category Tabs */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === null
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loadingProducts ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State - No Products in Category */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {activeCategory ? `Belum ada menu ${activeCategory}` : "Belum ada menu"}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {activeCategory
                ? `Outlet ini belum menambahkan menu untuk kategori ${activeCategory}.`
                : "Outlet ini belum menambahkan menu. Silakan coba outlet lain atau kembali nanti."
              }
            </p>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Kembali ke Beranda</span>
            </Link>
          </motion.div>
        ) : (
          /* Product List */
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    {!product.is_available && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">
                        Habis
                      </span>
                    )}
                  </div>
                  <p className="text-orange-600 font-medium mt-1">
                    {product.discount_price ? (
                      <span className="line-through text-gray-400 text-sm mr-1">
                        Rp {(product.price + ((product as any).markup_enabled !== false ? 1000 : 0)).toLocaleString("id-ID")}
                      </span>
                    ) : null}
                    Rp {calculateProductPrice(product).toLocaleString("id-ID")}
                  </p>

                  {/* Variant Selection */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-500">Varian:</label>
                      <select
                        className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
                        value={selectedVariants[product.id] || ""}
                        onChange={(e) =>
                          setSelectedVariants({
                            ...selectedVariants,
                            [product.id]: e.target.value,
                          })
                        }
                      >
                        <option value="">Pilih Varian</option>
                        {product.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name} (+Rp {variant.price_adjustment.toLocaleString("id-ID")})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Extra Selection */}
                  {product.extras && product.extras.length > 0 && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-500">Tambahan:</label>
                      <div className="flex flex-wrap mt-1">
                        {product.extras.map((extra) => (
                          <label key={extra.id} className="mr-2">
                            <input
                              type="checkbox"
                              className="mr-1"
                              checked={selectedExtras[product.id]?.includes(extra.id) || false}
                              onChange={(e) => {
                                const currentExtras = selectedExtras[product.id] || [];
                                if (e.target.checked) {
                                  setSelectedExtras({
                                    ...selectedExtras,
                                    [product.id]: [...currentExtras, extra.id],
                                  });
                                } else {
                                  setSelectedExtras({
                                    ...selectedExtras,
                                    [product.id]: currentExtras.filter((id) => id !== extra.id),
                                  });
                                }
                              }}
                            />
                            {extra.name} (+Rp {extra.price.toLocaleString("id-ID")})
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.is_available}
                    className="flex items-center justify-center w-10 h-10 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed relative"
                  >
                    <Plus className="w-5 h-5" />
                    {getProductCartQuantity(product) > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {getProductCartQuantity(product)}
                      </span>
                    )}
                  </button>
                  {getProductCartQuantity(product) > 0 && (
                    <span className="text-xs text-orange-600 font-medium">
                      {getProductCartQuantity(product)}x
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <Link
          to="/home/cart"
          className="fixed bottom-20 md:bottom-8 right-4 sm:right-8 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-3 px-6 py-4 z-50"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-medium">
            {totalItems} Item
          </span>
        </Link>
      )}
    </div>
  );
}
