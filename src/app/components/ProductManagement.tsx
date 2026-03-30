import { useState } from "react";
import { Plus, Edit2, Trash2, X, Package } from "lucide-react";
import { useData, Product, ProductSize, ProductExtra, Outlet as OutletType } from "../contexts/DataContext";
import { formatCurrency } from "../utils/financeCalculations";

export function ProductManagement() {
  const { products, outlets, addProduct, updateProduct, deleteProduct, getProductsByOutlet } = useData();
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    price: 0,
    discountPrice: 0,
    description: "",
    category: "Makanan" as "Makanan" | "Minuman",
    sizes: [] as ProductSize[],
    extras: [] as ProductExtra[],
  });

  // Size form state
  const [sizeForm, setSizeForm] = useState({ name: "", priceAdjustment: 0 });
  const [showSizeInput, setShowSizeInput] = useState(false);

  // Extra form state
  const [extraForm, setExtraForm] = useState({ name: "", price: 0 });
  const [showExtraInput, setShowExtraInput] = useState(false);

  const handleAddProduct = (outletId: string) => {
    setSelectedOutlet(outletId);
    setEditingProduct(null);
    setProductForm({
      name: "",
      price: 0,
      discountPrice: 0,
      description: "",
      category: "Makanan",
      sizes: [],
      extras: [],
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedOutlet(product.outletId);
    setProductForm({
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice || 0,
      description: product.description,
      category: product.category,
      sizes: product.sizes || [],
      extras: product.extras || [],
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.price || !selectedOutlet) {
      alert("Mohon lengkapi data produk!");
      return;
    }

    const productData = {
      outletId: selectedOutlet,
      name: productForm.name,
      price: productForm.price,
      discountPrice: productForm.discountPrice > 0 ? productForm.discountPrice : undefined,
      description: productForm.description,
      category: productForm.category,
      sizes: productForm.sizes,
      extras: productForm.extras,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    setShowProductModal(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Yakin ingin menghapus produk ini?")) {
      deleteProduct(id);
    }
  };

  const handleAddSize = () => {
    if (!sizeForm.name) return;
    const newSize: ProductSize = {
      id: `size_${Date.now()}`,
      name: sizeForm.name,
      priceAdjustment: sizeForm.priceAdjustment,
    };
    setProductForm({
      ...productForm,
      sizes: [...productForm.sizes, newSize],
    });
    setSizeForm({ name: "", priceAdjustment: 0 });
    setShowSizeInput(false);
  };

  const handleRemoveSize = (sizeId: string) => {
    setProductForm({
      ...productForm,
      sizes: productForm.sizes.filter((s) => s.id !== sizeId),
    });
  };

  const handleAddExtra = () => {
    if (!extraForm.name || !extraForm.price) return;
    const newExtra: ProductExtra = {
      id: `extra_${Date.now()}`,
      name: extraForm.name,
      price: extraForm.price,
    };
    setProductForm({
      ...productForm,
      extras: [...productForm.extras, newExtra],
    });
    setExtraForm({ name: "", price: 0 });
    setShowExtraInput(false);
  };

  const handleRemoveExtra = (extraId: string) => {
    setProductForm({
      ...productForm,
      extras: productForm.extras.filter((e) => e.id !== extraId),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Manajemen Produk</h2>
      </div>

      {/* Outlet List with Products */}
      <div className="space-y-6">
        {outlets.map((outlet) => {
          const outletProducts = getProductsByOutlet(outlet.id);
          return (
            <div key={outlet.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{outlet.name}</h3>
                  <p className="text-sm text-gray-600">{outlet.village}</p>
                </div>
                <button
                  onClick={() => handleAddProduct(outlet.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk</span>
                </button>
              </div>

              {/* Products Grid */}
              {outletProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outletProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {product.discountPrice ? (
                              <>
                                <span className="text-sm text-gray-500 line-through">
                                  {formatCurrency(product.price)}
                                </span>
                                <span className="text-sm font-semibold text-orange-600">
                                  {formatCurrency(product.discountPrice)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                          </div>
                          <span className="inline-block px-2 py-1 mt-2 text-xs bg-gray-100 text-gray-700 rounded">
                            {product.category}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {product.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex gap-2 text-xs text-gray-500">
                        {product.sizes.length > 0 && (
                          <span>{product.sizes.length} ukuran</span>
                        )}
                        {product.extras.length > 0 && (
                          <span>{product.extras.length} extra</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Belum ada produk. Klik "Tambah Produk" untuk memulai.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProductModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? "Edit Produk" : "Tambah Produk"}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Contoh: Nasi Goreng Spesial"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Normal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: parseInt(e.target.value) || 0 })}
                    placeholder="15000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Diskon (opsional)
                  </label>
                  <input
                    type="number"
                    value={productForm.discountPrice}
                    onChange={(e) => setProductForm({ ...productForm, discountPrice: parseInt(e.target.value) || 0 })}
                    placeholder="12000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Deskripsi produk..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Sizes Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Ukuran / Varian</label>
                  <button
                    onClick={() => setShowSizeInput(!showSizeInput)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Tambah Ukuran
                  </button>
                </div>
                
                {showSizeInput && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={sizeForm.name}
                        onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value })}
                        placeholder="Small / Medium / Large"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                      <input
                        type="number"
                        value={sizeForm.priceAdjustment}
                        onChange={(e) => setSizeForm({ ...sizeForm, priceAdjustment: parseInt(e.target.value) || 0 })}
                        placeholder="Tambahan harga"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSize}
                        className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                      >
                        Tambah
                      </button>
                      <button
                        onClick={() => setShowSizeInput(false)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {productForm.sizes.length > 0 && (
                  <div className="space-y-2">
                    {productForm.sizes.map((size) => (
                      <div
                        key={size.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{size.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            {size.priceAdjustment > 0 ? `+${formatCurrency(size.priceAdjustment)}` : "Harga normal"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveSize(size.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extras Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Extra / Addon</label>
                  <button
                    onClick={() => setShowExtraInput(!showExtraInput)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Tambah Extra
                  </button>
                </div>
                
                {showExtraInput && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={extraForm.name}
                        onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                        placeholder="Extra Sambal / Extra Keju"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                      <input
                        type="number"
                        value={extraForm.price}
                        onChange={(e) => setExtraForm({ ...extraForm, price: parseInt(e.target.value) || 0 })}
                        placeholder="Harga"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddExtra}
                        className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                      >
                        Tambah
                      </button>
                      <button
                        onClick={() => setShowExtraInput(false)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {productForm.extras.length > 0 && (
                  <div className="space-y-2">
                    {productForm.extras.map((extra) => (
                      <div
                        key={extra.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{extra.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            +{formatCurrency(extra.price)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveExtra(extra.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowProductModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveProduct}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Simpan Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}