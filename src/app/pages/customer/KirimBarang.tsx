import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Scale,
  Loader2,
} from "lucide-react";
import { useData, Village } from "../../contexts/DataContext";
import {
  calculateOrderFinance,
  formatCurrency,
  getDefaultFeeSettings,
  generateUniquePaymentCode,
} from "../../utils/financeCalculations";
import { toast } from "sonner";
import type { TablesInsert } from "../../../lib/database.types";

const VILLAGES: Village[] = [
  "Desa Bukit Sungkai",
  "Desa Sekuningan Baru",
  "Desa Balai Riam (Pusat Kecamatan)",
  "Desa Bangun Jaya",
  "Desa Lupu Peruca",
  "Desa Natai Kondang",
  "Desa Ajang",
];

const PACKAGE_CATEGORIES = [
  "Dokumen",
  "Makanan",
  "Paket kecil",
  "Paket sedang",
  "Lainnya",
];

export function KirimBarang() {
  const navigate = useNavigate();
  const { addOrder, getDistance, getDeliveryFee, feeSettings, outlets, orders, appSettings } = useData();

  // Sender (Pengirim) Details
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [fromVillage, setFromVillage] = useState<Village | "">("");
  const [fromAddress, setFromAddress] = useState("");

  // Receiver (Penerima) Details
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [toVillage, setToVillage] = useState<Village | "">("");
  const [toAddress, setToAddress] = useState("");

  // Package Details
  const [packageCategory, setPackageCategory] = useState("");
  const [estimatedWeight, setEstimatedWeight] = useState("");
  const [notes, setNotes] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "transfer-bri" | "transfer-dana"
  >("cod");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build FeeSettings from context data
  const fees = {
    cost_per_km:
      feeSettings.cost_per_km ?? getDefaultFeeSettings().cost_per_km,
    service_fee:
      feeSettings.service_fee ?? getDefaultFeeSettings().service_fee,
    admin_fee: feeSettings.admin_fee ?? getDefaultFeeSettings().admin_fee,
    driver_share_pct:
      feeSettings.driver_share_pct ?? getDefaultFeeSettings().driver_share_pct,
    admin_share_pct:
      feeSettings.admin_share_pct ?? getDefaultFeeSettings().admin_share_pct,
    min_distance_km:
      feeSettings.min_distance_km ?? getDefaultFeeSettings().min_distance_km,
  };

  // Calculate distance and pricing
  const rawDistance =
    fromVillage && toVillage ? getDistance(fromVillage, toVillage) : 0;
  const deliveryFeeFromMatrix =
    fromVillage && toVillage ? getDeliveryFee(fromVillage, toVillage) : 0;
  const distance = rawDistance;
  const subtotal = 0; // No item subtotal for delivery service
  const finance = calculateOrderFinance(subtotal, distance, 0, fees, deliveryFeeFromMatrix);

  // Display weight (minimum 1kg)
  const displayWeight =
    estimatedWeight && parseFloat(estimatedWeight) < 1
      ? "1 kg"
      : estimatedWeight
        ? `${estimatedWeight} kg`
        : "0 kg";

  // Use first available outlet as fallback for delivery service
  const deliveryOutlet = outlets[0];

  const handleSubmit = async () => {
    // Validation
    if (!senderName || !senderPhone || !fromVillage || !fromAddress) {
      toast.error("Mohon lengkapi data pengirim");
      return;
    }

    if (!receiverName || !receiverPhone || !toVillage || !toAddress) {
      toast.error("Mohon lengkapi data penerima");
      return;
    }

    if (!packageCategory || !estimatedWeight) {
      toast.error("Mohon lengkapi detail barang");
      return;
    }

    if (!deliveryOutlet) {
      toast.error("Tidak ada outlet tersedia");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate unique 3-digit payment code for transfer payments
      // Collect existing codes from today's orders to avoid duplicates
      const today = new Date().toDateString();
      const todayOrderCodes = orders
        .filter(o => o.unique_payment_code && new Date(o.created_at).toDateString() === today)
        .map(o => o.unique_payment_code as number);

      const uniquePaymentCode =
        paymentMethod !== "cod" ? generateUniquePaymentCode(todayOrderCodes) : null;

      const finalPaymentAmount = uniquePaymentCode
        ? finance.total + uniquePaymentCode
        : finance.total;

      // Determine payment provider
      const paymentProvider =
        paymentMethod === "transfer-bri"
          ? "BRI"
          : paymentMethod === "transfer-dana"
            ? "DANA"
            : null;

      const orderId = crypto.randomUUID();

      // Build order data with snake_case fields
      const orderData: TablesInsert<"orders"> = {
        id: orderId,
        customer_name: senderName,
        customer_phone: senderPhone,
        customer_village: toVillage,
        address: toAddress,
        outlet_id: deliveryOutlet.id,
        outlet_name: deliveryOutlet.name,
        subtotal,
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
        delivery_data: {
          sender_name: senderName,
          sender_phone: senderPhone,
          from_village: fromVillage,
          from_address: fromAddress,
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          to_village: toVillage,
          to_address: toAddress,
          package_category: packageCategory,
          estimated_weight:
            parseFloat(estimatedWeight) < 1 ? 1 : parseFloat(estimatedWeight),
          notes,
        },
      };

      // Build order items array for delivery service
      const orderItems: TablesInsert<"order_items">[] = [
        {
          order_id: orderId,
          product_id: null,
          name: `Kirim Barang: ${packageCategory}`,
          price: finance.total,
          quantity: 1,
          item_total: finance.total,
          selected_variant: displayWeight,
          selected_extras: notes ? [notes] : [],
        },
      ];

      const newOrderId = await addOrder(orderData, orderItems);

      toast.success("Pengiriman berhasil dibuat!");

      // Redirect based on payment method
      if (paymentMethod === "cod") {
        navigate(`/home/tracking/${newOrderId}`);
      } else {
        navigate(`/home/payment/${newOrderId}`);
      }
    } catch (error) {
      console.error("Failed to create delivery order:", error);
      toast.error("Gagal membuat pengiriman. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20 md:pb-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <button
          onClick={() => navigate("/service-selection")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kirim Barang
          </h1>
          <p className="text-gray-600">
            Kirim paket, dokumen, atau barang antar desa dengan aman
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sender Details */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Data Pengirim
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Pengirim *
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon *
                  </label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="08xx-xxxx-xxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dari Desa *
                  </label>
                  <select
                    value={fromVillage}
                    onChange={(e) =>
                      setFromVillage(e.target.value as Village)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent bg-white"
                  >
                    <option value="">Pilih desa</option>
                    {VILLAGES.map((village) => {
                      const isInactive = (appSettings.inactive_villages || []).includes(village);
                      return (
                        <option key={village} value={village} disabled={isInactive}>
                          {village} {isInactive ? "(Tidak Tersedia)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Lengkap *
                  </label>
                  <input
                    type="text"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="Alamat penjemputan"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Receiver Details */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Data Penerima
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Penerima *
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nama penerima"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon *
                  </label>
                  <input
                    type="tel"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="08xx-xxxx-xxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ke Desa *
                  </label>
                  <select
                    value={toVillage}
                    onChange={(e) => setToVillage(e.target.value as Village)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent bg-white"
                  >
                    <option value="">Pilih desa</option>
                    {VILLAGES.map((village) => {
                      const isInactive = (appSettings.inactive_villages || []).includes(village);
                      return (
                        <option key={village} value={village} disabled={isInactive}>
                          {village} {isInactive ? "(Tidak Tersedia)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Lengkap *
                  </label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="Alamat tujuan"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Detail Barang
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis Barang *
                  </label>
                  <select
                    value={packageCategory}
                    onChange={(e) => setPackageCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent bg-white"
                  >
                    <option value="">Pilih jenis barang</option>
                    {PACKAGE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimasi Berat (kg) *
                  </label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.1"
                      value={estimatedWeight}
                      onChange={(e) => setEstimatedWeight(e.target.value)}
                      placeholder="0.5"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                    />
                  </div>
                  {estimatedWeight && parseFloat(estimatedWeight) < 1 && (
                    <p className="text-xs text-orange-600 mt-1">
                      * Minimum berat 1 kg akan dikenakan
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan untuk Driver (Opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Barang mudah pecah, harap hati-hati"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Metode Pembayaran
              </h2>

              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#FF6A00] transition-colors">
                  <input
                    type="radio"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "cod")
                    }
                    className="w-4 h-4 text-[#FF6A00] focus:ring-[#FF6A00]"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">
                      Cash on Delivery (COD)
                    </p>
                    <p className="text-sm text-gray-500">
                      Bayar saat barang sampai
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#FF6A00] transition-colors">
                  <input
                    type="radio"
                    value="transfer-bri"
                    checked={paymentMethod === "transfer-bri"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "transfer-bri")
                    }
                    className="w-4 h-4 text-[#FF6A00] focus:ring-[#FF6A00]"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">Transfer BRI</p>
                    <p className="text-sm text-gray-500">
                      Transfer ke rekening BRI
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#FF6A00] transition-colors">
                  <input
                    type="radio"
                    value="transfer-dana"
                    checked={paymentMethod === "transfer-dana"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "transfer-dana")
                    }
                    className="w-4 h-4 text-[#FF6A00] focus:ring-[#FF6A00]"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">Transfer DANA</p>
                    <p className="text-sm text-gray-500">Transfer ke DANA</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Ringkasan Pengiriman
              </h3>

              {distance > 0 ? (
                <div className="space-y-4">
                  {/* Route */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Dari
                        </p>
                        <p className="text-sm text-gray-600">{fromVillage}</p>
                      </div>
                    </div>
                    <div className="my-2 ml-2 border-l-2 border-dashed border-gray-300 h-6" />
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Ke</p>
                        <p className="text-sm text-gray-600">{toVillage}</p>
                      </div>
                    </div>
                  </div>

                  {/* Package Info */}
                  {packageCategory && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-medium text-gray-900">
                          Detail Barang
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {packageCategory}
                      </p>
                      {estimatedWeight && (
                        <p className="text-sm text-gray-600 mt-1">
                          Berat: {displayWeight}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Jarak</span>
                      <span className="font-medium text-gray-900">
                        {rawDistance > 0 ? `${rawDistance} km` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Biaya Layanan</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(finance.serviceFee)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Biaya Kirim ({finance.chargedDistance} km)
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(finance.deliveryFee)}
                      </span>
                    </div>
                    {finance.isMinimumChargeApplied && (
                      <p className="text-xs text-orange-600">
                        * Minimum biaya kirim 1 km
                      </p>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-[#FF6A00] text-xl">
                          {formatCurrency(finance.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#FF6A00] to-orange-600 text-white py-4 rounded-lg font-bold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      "Buat Pengiriman"
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Pilih desa pengirim dan penerima untuk melihat estimasi biaya
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
