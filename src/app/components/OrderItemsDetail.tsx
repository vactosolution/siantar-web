import { useState, useEffect } from "react";
import { X, ShoppingBag, Package, Loader2, ImageOff } from "lucide-react";
import { useData, type OrderItemWithProduct } from "../contexts/DataContext";
import { formatCurrency } from "../utils/financeCalculations";

interface OrderItemsDetailProps {
  orderId: string;
  outletName?: string;
  /** "inline" renders directly, "modal" shows in a popup overlay */
  mode?: "inline" | "modal";
  /** Only used in modal mode — called when modal is closed */
  onClose?: () => void;
}

function ItemImage({ url, name }: { url?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);

  if (!url || imgError) {
    return (
      <div className="w-14 h-14 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <ImageOff className="w-5 h-5 text-orange-300" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-100"
      onError={() => setImgError(true)}
    />
  );
}

function ItemsList({
  items,
  outletName,
}: {
  items: OrderItemWithProduct[];
  outletName?: string;
}) {
  return (
    <div>
      {outletName && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <ShoppingBag className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-gray-900">{outletName}</span>
        </div>
      )}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ItemImage url={item.image_url} name={item.name} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm leading-snug">
                {item.name}
              </div>
              {item.selected_variant && (
                <div className="text-xs text-orange-600 mt-0.5">
                  Varian: {item.selected_variant}
                </div>
              )}
              {item.selected_extras && item.selected_extras.length > 0 && (
                <div className="text-xs text-blue-600 mt-0.5">
                  Extra: {item.selected_extras.join(", ")}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(item.price)} × {item.quantity}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-gray-900 text-sm">
                {formatCurrency(item.item_total)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
        <span className="font-medium text-gray-700 text-sm">
          Total ({items.reduce((sum, i) => sum + i.quantity, 0)} item)
        </span>
        <span className="font-bold text-orange-600">
          {formatCurrency(items.reduce((sum, i) => sum + i.item_total, 0))}
        </span>
      </div>
    </div>
  );
}

export function OrderItemsDetail({
  orderId,
  outletName,
  mode = "modal",
  onClose,
}: OrderItemsDetailProps) {
  const { fetchOrderItems, orderItemsCache } = useData();
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const result = await fetchOrderItems(orderId);
      if (!cancelled) {
        setItems(result);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId, fetchOrderItems]);

  // Inline mode: render directly in parent
  if (mode === "inline") {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-sm text-gray-500">Memuat item...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 text-sm">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          Tidak ada item pesanan
        </div>
      );
    }

    return <ItemsList items={items} outletName={outletName} />;
  }

  // Modal mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Detail Pesanan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-72px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <span className="ml-3 text-gray-500">Memuat item pesanan...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Tidak ada item pesanan</p>
            </div>
          ) : (
            <ItemsList items={items} outletName={outletName} />
          )}
        </div>
      </div>
    </div>
  );
}
