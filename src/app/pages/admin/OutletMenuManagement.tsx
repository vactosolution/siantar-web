import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, Image as ImageIcon, PackageX } from "lucide-react";
import { useData, Product, ProductSize, ProductExtra } from "../../contexts/DataContext";
import { formatCurrency } from "../../utils/financeCalculations";

export function OutletMenuManagement() {
  const { outletId } = useParams<{ outletId: string }>();
  const navigate = useNavigate();
  const { outlets, products, addProduct, updateProduct, deleteProduct, getProductsByOutlet } = useData();
  
  const outlet = outlets.find((o) => o.id === outletId);
  const outletProducts = outletId ? getProductsByOutlet(outletId) : [];

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Product | null>(null);
  
  // Menu form state
  const [menuForm, setMenuForm] = useState({
    name: "",
    price: 0,
    discountPrice: 0,
    description: "",
    category: "Makanan" as "Makanan" | "Minuman",
    sizes: [] as ProductSize[],
    extras: [] as ProductExtra[],
    imageUrl: "",
    isAvailable: true,
  });

  // Size and extra forms
  const [sizeForm, setSizeForm] = useState({ name: "", priceAdjustment: 0 });
  const [showSizeInput, setShowSizeInput] = useState(false);
  const [extraForm, setExtraForm] = useState({ name: "", price: 0 });
  const [showExtraInput, setShowExtraInput] = useState(false);

  if (!outlet) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Outlet tidak ditemukan</p>
          <button
            onClick={() => navigate("/admin")}
            className="mt-4 text-orange-600 hover:underline"
          >
            Kembali ke Admin Panel
          </button>
        </div>
      </div>
    );
  }

  const handleAddMenu = () => {
    setEditingMenu(null);
    setMenuForm({
      name: "",
      price: 0,
      discountPrice: 0,
      description: "",
      category: "Makanan",
      sizes: [],
      extras: [],
      imageUrl: "",
      isAvailable: true,
    });
    setShowMenuModal(true);
  };

  const handleEditMenu = (menu: Product) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      price: menu.price,
      discountPrice: menu.discountPrice || 0,
      description: menu.description,
      category: menu.category,
      sizes: menu.sizes || [],
      extras: menu.extras || [],
      imageUrl: menu.imageUrl || "",
      isAvailable: menu.isAvailable,
    });
    setShowMenuModal(true);
  };

  const handleSaveMenu = () => {
    if (!menuForm.name || !menuForm.price || !outletId) {
      alert("Mohon lengkapi nama dan harga menu!");
      return;
    }

    const menuData = {
      outletId,
      name: menuForm.name,
      price: menuForm.price,
      discountPrice: menuForm.discountPrice > 0 ? menuForm.discountPrice : undefined,
      description: menuForm.description,
      category: menuForm.category,
      sizes: menuForm.sizes,
      extras: menuForm.extras,
      imageUrl: menuForm.imageUrl || undefined,
      isAvailable: menuForm.isAvailable,
    };

    if (editingMenu) {
      updateProduct(editingMenu.id, menuData);
    } else {
      addProduct(menuData);
    }
    setShowMenuModal(false);
  };

  const handleDeleteMenu = (id: string) => {
    if (confirm("Yakin ingin menghapus menu ini?")) {
      deleteProduct(id);
    }
  };

  const handleToggleAvailability = (menu: Product) => {
    updateProduct(menu.id, { isAvailable: !menu.isAvailable });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for simple storage (in production, upload to server/cloud)
      const reader = new FileReader();
      reader.onloadend = () => {
        setMenuForm({ ...menuForm, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSize = () => {
    if (!sizeForm.name) return;
    const newSize: ProductSize = {
      id: `size_${Date.now()}`,
      name: sizeForm.name,
      priceAdjustment: sizeForm.priceAdjustment,
    };
    setMenuForm({
      ...menuForm,
      sizes: [...menuForm.sizes, newSize],
    });
    setSizeForm({ name: "", priceAdjustment: 0 });
    setShowSizeInput(false);
  };

  const handleRemoveSize = (sizeId: string) => {
    setMenuForm({
      ...menuForm,
      sizes: menuForm.sizes.filter((s) => s.id !== sizeId),
    });
  };

  const handleAddExtra = () => {
    if (!extraForm.name || !extraForm.price) return;
    const newExtra: ProductExtra = {
      id: `extra_${Date.now()}`,
      name: extraForm.name,
      price: extraForm.price,
    };
    setMenuForm({
      ...menuForm,
      extras: [...menuForm.extras, newExtra],
    });
    setExtraForm({ name: "", price: 0 });
    setShowExtraInput(false);
  };

  const handleRemoveExtra = (extraId: string) => {
    setMenuForm({
      ...menuForm,
      extras: menuForm.extras.filter((e) => e.id !== extraId),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{outlet.name}</h1>
              <p className="text-white/70 mt-1">{outlet.village}</p>
            </div>
            <button
              onClick={handleAddMenu}
              className="flex items-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="max-w-7xl mx-auto p-4">
        {outletProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outletProducts.map((menu) => (
              <div
                key={menu.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                  !menu.isAvailable ? "opacity-60" : ""
                }`}
              >
                {/* Menu Image */}
                <div className="relative h-48 bg-gray-200">
                  {menu.imageUrl ? (
                    <img
                      src={menu.imageUrl}
                      alt={menu.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {!menu.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">
                        Stok Habis
                      </span>
                    </div>
                  )}
                </div>

                {/* Menu Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{menu.name}</h3>
                      <span className="inline-block px-2 py-1 mt-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {menu.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {menu.discountPrice ? (
                      <>
                        <span className="text-sm text-gray-500 line-through">
                          {formatCurrency(menu.price)}
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(menu.discountPrice)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(menu.price)}
                      </span>
                    )}
                  </div>

                  {menu.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {menu.description}
                    </p>
                  )}

                  <div className="flex gap-2 text-xs text-gray-500 mb-3">
                    {menu.sizes.length > 0 && <span>{menu.sizes.length} ukuran</span>}
                    {menu.extras.length > 0 && <span>{menu.extras.length} extra</span>}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAvailability(menu)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        menu.isAvailable
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {menu.isAvailable ? "Tersedia" : "Habis"}
                    </button>
                    <button
                      onClick={() => handleEditMenu(menu)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMenu(menu.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <PackageX className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Menu Belum Tersedia
            </h3>
            <p className="text-gray-600 mb-6">
              Outlet ini belum memiliki menu. Klik "Tambah Menu" untuk mulai menambahkan.
            </p>
            <button
              onClick={handleAddMenu}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Menu Pertama</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMenuModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMenu ? "Edit Menu" : "Tambah Menu"}
              </h2>
              <button
                onClick={() => setShowMenuModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Menu
                </label>
                <div className="flex flex-col items-center gap-4">
                  {menuForm.imageUrl ? (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={menuForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setMenuForm({ ...menuForm, imageUrl: "" })}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Klik untuk upload gambar
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG (Max 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Menu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
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
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: parseInt(e.target.value) || 0 })}
                    placeholder="15000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Diskon
                  </label>
                  <input
                    type="number"
                    value={menuForm.discountPrice}
                    onChange={(e) => setMenuForm({ ...menuForm, discountPrice: parseInt(e.target.value) || 0 })}
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
                  value={menuForm.category}
                  onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value as any })}
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
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  placeholder="Deskripsi menu..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Ketersediaan
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Aktifkan jika menu tersedia
                  </p>
                </div>
                <button
                  onClick={() => setMenuForm({ ...menuForm, isAvailable: !menuForm.isAvailable })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    menuForm.isAvailable ? "bg-green-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      menuForm.isAvailable ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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

                {menuForm.sizes.length > 0 && (
                  <div className="space-y-2">
                    {menuForm.sizes.map((size) => (
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

                {menuForm.extras.length > 0 && (
                  <div className="space-y-2">
                    {menuForm.extras.map((extra) => (
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
                onClick={() => setShowMenuModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveMenu}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Simpan Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
