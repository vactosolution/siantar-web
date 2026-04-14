import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, Image as ImageIcon, PackageX, Loader2, Copy, Star } from "lucide-react";
import { useData, ProductWithDetails, ProductVariant, ProductExtra } from "../../contexts/DataContext";
import { formatCurrency } from "../../utils/financeCalculations";
import { uploadFile } from "../../../lib/supabase";
import { toast } from "sonner";

export function OutletMenuManagement() {
  const { outletId } = useParams<{ outletId: string }>();
  const navigate = useNavigate();
  const { 
    outlets, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    getProductsByOutlet, 
    loadingProducts,
    appSettings 
  } = useData();

  const menuCategories = appSettings.menu_categories || [
    "Bakso & Mie Ayam", "Nasi Goreng & Mie Goreng", "Ayam Bakar & Ayam Goreng",
    "Bebek & Ikan", "Seafood", "Soto & Sop", "Pecel Lele / Lalapan",
    "Rice Bowl & Nasi Kotak", "Sate & Grill", "Martabak & Terang Bulan",
    "Snack & Camilan", "Gorengan", "Cilok, Bakso Bakar & Jajanan",
    "Kue & Dessert", "Roti & Bakery", "Minuman Dingin", "Kopi & Teh",
    "Jus & Minuman Buah", "Es Campur / Es Tradisional", "Frozen Food",
    "Catering / Nasi Box"
  ];

  const outlet = outlets.find((o) => o.id === outletId);
  const outletProducts = outletId ? getProductsByOutlet(outletId) : [];

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<ProductWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Menu form state
  const [menuForm, setMenuForm] = useState({
    name: "",
    price: 0,
    discount_price: 0,
    description: "",
    category: menuCategories[0],
    variants: [] as ProductVariant[],
    extras: [] as ProductExtra[],
    image_url: "" as string | null,
    is_available: true,
    is_best_seller: false,
    is_recommended: false,
    markup_enabled: null as boolean | null, // null = Inherit from Outlet
  });

  // Variant and extra forms
  const [variantForm, setVariantForm] = useState({ name: "", price_adjustment: 0 });
  const [showVariantInput, setShowVariantInput] = useState(false);
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
      discount_price: 0,
      description: "",
      category: menuCategories[0],
      variants: [],
      extras: [],
      image_url: null,
      is_available: true,
      is_best_seller: false,
      is_recommended: false,
      markup_enabled: null,
    });
    setShowMenuModal(true);
  };

  const handleEditMenu = (menu: ProductWithDetails) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      price: menu.price,
      discount_price: menu.discount_price || 0,
      description: menu.description || "",
      category: menu.category,
      variants: menu.variants || [],
      extras: menu.extras || [],
      image_url: menu.image_url,
      is_available: menu.is_available,
      is_best_seller: (menu as any).is_best_seller || false,
      is_recommended: (menu as any).is_recommended || false,
      markup_enabled: menu.markup_enabled,
    });
    setShowMenuModal(true);
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name || !menuForm.price || !outletId) {
      toast.error("Mohon lengkapi nama dan harga menu!");
      return;
    }

    setSaving(true);
    try {
      const productData = {
        outlet_id: outletId,
        name: menuForm.name,
        price: menuForm.price,
        discount_price: menuForm.discount_price > 0 ? menuForm.discount_price : null,
        description: menuForm.description || null,
        category: menuForm.category,
        image_url: menuForm.image_url || null,
        is_available: menuForm.is_available,
        is_best_seller: menuForm.is_best_seller,
        is_recommended: menuForm.is_recommended,
        markup_enabled: menuForm.markup_enabled,
      };

      const variantsData = menuForm.variants.map((v) => ({
        name: v.name,
        price_adjustment: v.price_adjustment,
        product_id: editingMenu?.id || "",
      }));

      const extrasData = menuForm.extras.map((e) => ({
        name: e.name,
        price: e.price,
        product_id: editingMenu?.id || "",
      }));

      if (editingMenu) {
        await updateProduct(editingMenu.id, productData);
        toast.success("Menu berhasil diperbarui!");
      } else {
        await addProduct(productData, variantsData, extrasData);
        toast.success("Menu berhasil ditambahkan!");
      }
      setShowMenuModal(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan menu");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm("Yakin ingin menghapus menu ini?")) return;
    setDeleting(id);
    try {
      await deleteProduct(id);
      toast.success("Menu berhasil dihapus!");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus menu");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleAvailability = async (menu: ProductWithDetails) => {
    try {
      await updateProduct(menu.id, { is_available: !menu.is_available });
      toast.success(menu.is_available ? "Menu ditandai habis" : "Menu ditandai tersedia");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah ketersediaan");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${Date.now()}.${ext}`;
      const url = await uploadFile("product-images", path, file);
      setMenuForm({ ...menuForm, image_url: url });
      toast.success("Gambar berhasil diupload!");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengupload gambar");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddVariant = () => {
    if (!variantForm.name) return;
    const newVariant: ProductVariant = {
      id: `temp_${Date.now()}`,
      name: variantForm.name,
      price_adjustment: variantForm.price_adjustment,
      product_id: "",
      created_at: new Date().toISOString(),
    };
    setMenuForm({
      ...menuForm,
      variants: [...menuForm.variants, newVariant],
    });
    setVariantForm({ name: "", price_adjustment: 0 });
    setShowVariantInput(false);
  };

  const handleRemoveVariant = (variantId: string) => {
    setMenuForm({
      ...menuForm,
      variants: menuForm.variants.filter((v) => v.id !== variantId),
    });
  };

  const handleAddExtra = () => {
    if (!extraForm.name) return;
    const newExtra: ProductExtra = {
      id: `temp_${Date.now()}`,
      name: extraForm.name,
      price: extraForm.price,
      product_id: "",
      created_at: new Date().toISOString(),
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

  const handleDuplicate = async (product: ProductWithDetails) => {
    setSaving(true);
    try {
      const newMenu = {
        outlet_id: outletId!,
        name: `${product.name} (Copy)`,
        price: product.price,
        discount_price: product.discount_price,
        description: product.description,
        category: product.category,
        image_url: product.image_url,
        is_available: product.is_available,
        is_best_seller: (product as any).is_best_seller || false,
        is_recommended: (product as any).is_recommended || false,
      };

      const variantsData = (product.variants || []).map((v) => ({
        name: v.name,
        price_adjustment: v.price_adjustment,
        product_id: "",
      }));

      const extrasData = (product.extras || []).map((e) => ({
        name: e.name,
        price: e.price,
        product_id: "",
      }));

      await addProduct(newMenu, variantsData, extrasData);
      toast.success("Menu berhasil diduplikat");
    } catch (error: any) {
      toast.error(error.message || "Gagal menduplikat menu");
    } finally {
      setSaving(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

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
                  !menu.is_available ? "opacity-60" : ""
                }`}
              >
                {/* Menu Image */}
                <div className="relative h-48 bg-gray-200">
                  {menu.image_url ? (
                    <img
                      src={menu.image_url}
                      alt={menu.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {!menu.is_available && (
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
                    {menu.discount_price ? (
                      <>
                        <span className="text-sm text-gray-500 line-through">
                          {formatCurrency(menu.price)}
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(menu.discount_price)}
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
                    {menu.variants.length > 0 && <span>{menu.variants.length} varian</span>}
                    {menu.extras.length > 0 && <span>{menu.extras.length} extra</span>}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAvailability(menu)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        menu.is_available
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {menu.is_available ? "Tersedia" : "Habis"}
                    </button>
                    <button
                      onClick={() => handleDuplicate(menu)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Duplikat Menu"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditMenu(menu)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMenu(menu.id)}
                      disabled={deleting === menu.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === menu.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
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
                  {menuForm.image_url ? (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={menuForm.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setMenuForm({ ...menuForm, image_url: null })}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">
                            Klik untuk upload gambar
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPG, PNG (Max 5MB)
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
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
                    value={menuForm.price === 0 ? "" : menuForm.price}
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
                    value={menuForm.discount_price === 0 ? "" : menuForm.discount_price}
                    onChange={(e) => setMenuForm({ ...menuForm, discount_price: parseInt(e.target.value) || 0 })}
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
                  onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {menuCategories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
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
                  onClick={() => setMenuForm({ ...menuForm, is_available: !menuForm.is_available })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    menuForm.is_available ? "bg-green-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      menuForm.is_available ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Best Seller Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-900">Best Seller</label>
                    <p className="text-xs text-gray-600 mt-1">Tandai sebagai menu terlaris</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuForm({ ...menuForm, is_best_seller: !menuForm.is_best_seller })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    menuForm.is_best_seller ? "bg-yellow-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      menuForm.is_best_seller ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Recommended Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900">Rekomendasi</label>
                  <p className="text-xs text-gray-600 mt-1">Tampilkan di slider rekomendasi</p>
                </div>
                <button
                  onClick={() => setMenuForm({ ...menuForm, is_recommended: !menuForm.is_recommended })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    menuForm.is_recommended ? "bg-orange-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      menuForm.is_recommended ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
               {/* Markup Toggle (3-state) */}
               <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💰</span>
                  <label className="text-sm font-medium text-gray-900">Tambahan +Rp1.000 (Markup)</label>
                </div>
                
                <div className="flex bg-white p-1 rounded-md border border-gray-200">
                  <button
                    onClick={() => setMenuForm({ ...menuForm, markup_enabled: null })}
                    className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all ${
                      menuForm.markup_enabled === null 
                        ? "bg-green-600 text-white shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Ikuti Kedai
                  </button>
                  <button
                    onClick={() => setMenuForm({ ...menuForm, markup_enabled: true })}
                    className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all ${
                      menuForm.markup_enabled === true 
                        ? "bg-green-600 text-white shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Selalu Aktif
                  </button>
                  <button
                    onClick={() => setMenuForm({ ...menuForm, markup_enabled: false })}
                    className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all ${
                      menuForm.markup_enabled === false 
                        ? "bg-green-600 text-white shadow-sm" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Nonaktif
                  </button>
                </div>
                
                <p className="text-[10px] text-gray-600 mt-2 px-1 italic">
                  * Status saat ini: {menuForm.markup_enabled === null 
                    ? `Mengikuti pengaturan kedai (${outlet.markup_enabled !== false ? 'Aktif' : 'Nonaktif'})` 
                    : (menuForm.markup_enabled ? 'Dipaksa Aktif' : 'Dipaksa Nonaktif')
                  }
                </p>
              </div>

              {/* Variants Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Varian</label>
                  <button
                    onClick={() => setShowVariantInput(!showVariantInput)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Tambah Varian
                  </button>
                </div>

                {showVariantInput && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={variantForm.name}
                        onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                        placeholder="Small / Medium / Large"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                      <input
                        type="number"
                        value={variantForm.price_adjustment === 0 ? "" : variantForm.price_adjustment}
                        onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: parseInt(e.target.value) || 0 })}
                        placeholder="Tambahan harga"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddVariant}
                        className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                      >
                        Tambah
                      </button>
                      <button
                        onClick={() => setShowVariantInput(false)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {menuForm.variants.length > 0 && (
                  <div className="space-y-2">
                    {menuForm.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{variant.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            {variant.price_adjustment > 0 ? `+${formatCurrency(variant.price_adjustment)}` : "Harga normal"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveVariant(variant.id)}
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
                        value={extraForm.price === 0 ? "" : extraForm.price}
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
                disabled={saving}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Menu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
