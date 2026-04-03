import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../../contexts/CartContext";
import { useData, Village } from "../../contexts/DataContext";
import {
  calculateOrderFinance,
  formatCurrency,
  getDefaultFeeSettings,
  generateUniquePaymentCode,
} from "../../utils/financeCalculations";
import type { TablesInsert } from "../../../lib/database.types";

const VILLAGES: Village[] = [
  "Desa Sekuningan Baru",
  "Desa Bukit Sungkai",
  "Desa Bangun Jaya",
  "Desa Balai Riam (Pusat Kecamatan)",
  "Desa Natai Kondang",
  "Desa Lupu Peruca",
];

export function Checkout() {
  const { items, subtotal: cartSubtotal, clearCart } = useCart();
  const { addOrder, outlets, getDistance, getDeliveryFee, feeSettings } = useData();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState<Village | "">("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "transfer-bri" | "transfer-dana">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate("/home");
    }
  }, [items.length, navigate]);

  // Get outlet from first item (assuming all items from same store)
  const outlet = outlets.find(o => o.id === items[0]?.outletId);

  // Calculate distance and delivery fee from matrix
  const rawDistance = village && outlet ? getDistance(village, outlet.village) : 0;
  const deliveryFeeFromMatrix = village && outlet ? getDeliveryFee(village, outlet.village) : 0;
  const distance = rawDistance;

  // Build FeeSettings from context data
  const fees = {
    cost_per_km: feeSettings.cost_per_km ?? getDefaultFeeSettings().cost_per_km,
    service_fee: feeSettings.service_fee ?? getDefaultFeeSettings().service_fee,
    admin_fee: feeSettings.admin_fee ?? getDefaultFeeSettings().admin_fee,
    driver_share_pct: feeSettings.driver_share_pct ?? getDefaultFeeSettings().driver_share_pct,
    admin_share_pct: feeSettings.admin_share_pct ?? getDefaultFeeSettings().admin_share_pct,
    min_distance_km: feeSettings.min_distance_km ?? getDefaultFeeSettings().min_distance_km,
  };

  const finance = calculateOrderFinance(cartSubtotal, distance, fees, deliveryFeeFromMatrix);

  const handleOrder = async () => {
    if (!name || !phone || !village || !address) {
      toast.error("Mohon lengkapi semua data");
      return;
    }

    if (!outlet) {
      toast.error("Outlet tidak ditemukan");
      return;
    }

    // Validate single-store order (all items must be from same store)
    const uniqueStores = new Set(items.map(item => item.outletId));
    if (uniqueStores.size > 1) {
      toast.error("Pesanan harus dari satu toko yang sama");
      return;
    }

    if (!outlet) {
      toast.error("Outlet tidak ditemukan");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate unique 3-digit payment code for transfer payments
      const uniquePaymentCode = paymentMethod !== "cod"
        ? generateUniquePaymentCode()
        : null;

      const finalPaymentAmount = uniquePaymentCode
        ? finance.total + uniquePaymentCode
        : finance.total;

      // Determine payment provider
      const paymentProvider = paymentMethod === "transfer-bri" ? "BRI" : paymentMethod === "transfer-dana" ? "DANA" : null;

      // Build order data with snake_case fields
      const orderData: TablesInsert<"orders"> = {
        id: crypto.randomUUID(),
        customer_name: name,
        customer_phone: phone,
        customer_village: village,
        address,
        outlet_id: outlet.id,
        outlet_name: outlet.name,
        subtotal: cartSubtotal,
        distance,
        charged_distance: finance.chargedDistance,
        delivery_fee: finance.deliveryFee,
        service_fee: finance.serviceFee,
        admin_fee: finance.adminFee,
        total: finance.total,
        payment_method: paymentMethod === "cod" ? "cod" : "transfer",
        payment_provider: paymentProvider,
        unique_payment_code: uniquePaymentCode,
        final_payment_amount: finalPaymentAmount,
        payment_status: "pending",
        status: "pending",
        is_manual_order: false,
        is_delivery_service: true,
      };

      // Build order items array
      const orderItems: TablesInsert<"order_items">[] = items.map(item => ({
        order_id: orderData.id!,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        item_total: item.price * item.quantity,
        selected_variant: item.selectedVariant?.name ?? null,
        selected_extras: item.selectedExtras.map(e => e.name),
      }));

      const orderId = await addOrder(orderData, orderItems);

      clearCart();

      // Redirect based on payment method
      if (paymentMethod === "cod") {
        navigate(`/home/tracking/${orderId}`);
      } else {
        navigate(`/home/payment/${orderId}`);
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error("Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/home/cart")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Informasi Pemesan
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Desa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={village}
                    onChange={(e) => setVillage(e.target.value as Village)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">-- Pilih Desa --</option>
                    {VILLAGES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Lengkap
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Masukkan alamat lengkap dengan patokan"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                {distance > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {village === outlet?.village
                        ? `Ongkir sesama desa: Rp 5.000`
                        : `Biaya pengiriman dihitung Rp ${fees.cost_per_km.toLocaleString("id-ID")}/km`
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Metode Pembayaran
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) => setPaymentMethod(e.target.value as "cod")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      Cash on Delivery (COD)
                    </div>
                    <div className="text-sm text-gray-600">
                      Bayar saat pesanan sampai
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="transfer-bri"
                    checked={paymentMethod === "transfer-bri"}
                    onChange={(e) => setPaymentMethod(e.target.value as "transfer-bri")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Transfer Bank BRI</div>
                    <div className="text-sm text-gray-600">
                      Transfer ke rekening toko
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="transfer-dana"
                    checked={paymentMethod === "transfer-dana"}
                    onChange={(e) => setPaymentMethod(e.target.value as "transfer-dana")}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Transfer Dana</div>
                    <div className="text-sm text-gray-600">
                      Transfer ke rekening toko
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">
                Ringkasan Pesanan
              </h2>

              {/* Items */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                {items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex justify-between text-sm">
                    <div>
                      <div className="text-gray-900">
                        {item.name} x{item.quantity}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {item.outletName}
                      </div>
                    </div>
                    <div className="text-gray-900 font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fees */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal Makanan</span>
                  <span className="text-gray-900">
                    {formatCurrency(finance.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Biaya Layanan</span>
                  <span className="text-gray-900">
                    {formatCurrency(finance.serviceFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Biaya Pengiriman</span>
                  <span className="text-gray-900">
                    {finance.deliveryFee > 15000 ? (
                      <>
                        <span className="line-through text-gray-400 mr-1">
                          {formatCurrency(Math.round(finance.deliveryFee * 1.15 / 1000) * 1000)}
                        </span>
                        {formatCurrency(finance.deliveryFee)}
                      </>
                    ) : (
                      formatCurrency(finance.deliveryFee)
                    )}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-semibold text-gray-900">
                  Total Bayar
                </span>
                <span className="text-xl font-bold text-orange-600">
                  {formatCurrency(finance.total)}
                </span>
              </div>

              <button
                onClick={handleOrder}
                disabled={isSubmitting}
                className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Memproses..." : "Pesan Sekarang"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
