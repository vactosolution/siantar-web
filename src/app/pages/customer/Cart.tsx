import { Link, useNavigate } from "react-router";
import { useTitle } from "../../hooks/useTitle";
import { ArrowLeft, Plus, Minus, Trash2, ImageIcon } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { formatCurrency } from "../../utils/financeCalculations";

export function Cart() {
  useTitle("Keranjang Belanja");
  const { items, updateQuantity, removeItem, updateItemNote, notes, setNotes, subtotal } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (items.length > 0) {
      navigate("/home/checkout");
    }
  };

  if (items.length === 0) {
    return (
      <div className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </Link>
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">Keranjang masih kosong</p>
            <Link
              to="/home"
              className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Mulai Belanja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Keranjang Belanja
        </h1>

        {/* Cart Items */}
        <div className="space-y-4 mb-6">
          {items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="bg-white rounded-2xl shadow-sm p-3 flex flex-col gap-3 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                {/* Image Section */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-200" />
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-tight mt-0.5 truncate">
                    {item.outletName}
                  </p>
                  
                  {/* Variant & Extra Info (Small) */}
                  {(item.selectedVariant || item.selectedExtras.length > 0) && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 border-l-2 border-gray-100 pl-2">
                      {item.selectedVariant && (
                        <span className="text-[10px] text-gray-500 italic">
                          {item.selectedVariant.name}
                        </span>
                      )}
                      {item.selectedExtras.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          + {item.selectedExtras.map((e) => e.name).join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <p className="text-gray-900 font-extrabold text-sm mt-1">
                    {formatCurrency(item.price)}
                  </p>
                </div>

                {/* Control Section */}
                <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white text-gray-600 rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-black text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white text-gray-600 rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Item Note Section */}
              <div className="border-t border-gray-100 pt-2">
                <input
                  type="text"
                  placeholder="Catatan per item (contoh: pedas, tambah es)"
                  value={item.note || ""}
                  onChange={(e) => updateItemNote(index, e.target.value)}
                  className="w-full text-[11px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Catatan untuk Driver
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Tolong belikan es batu ya"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center text-lg mb-4">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          >
            Lanjut ke Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
