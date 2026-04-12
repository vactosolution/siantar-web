import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Scale,
  Loader2,
  Navigation,
} from "lucide-react";
import { useData } from "../../contexts/DataContext";
import {
  calculateOrderFinance,
  formatCurrency,
  getDefaultFeeSettings,
  generateUniquePaymentCode,
  calculateDistance,
} from "../../utils/financeCalculations";
import { toast } from "sonner";
import type { TablesInsert } from "../../../lib/database.types";

const PACKAGE_CATEGORIES = [
  "Dokumen",
  "Makanan",
  "Paket kecil",
  "Paket sedang",
  "Lainnya",
];

export function KirimBarang() {
  const navigate = useNavigate();
  const { addOrder, feeSettings, outlets, orders } = useData();

  // Sender (Pengirim) Details
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Receiver (Penerima) Details
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Package Details
  const [packageCategory, setPackageCategory] = useState("");
  const [estimatedWeight, setEstimatedWeight] = useState("");
  const [notes, setNotes] = useState("");

  // UI States
  const [isLocatingFrom, setIsLocatingFrom] = useState(false);
  const [isLocatingTo, setIsLocatingTo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "transfer-bri" | "transfer-dana"
  >("cod");

  // Build FeeSettings
  const fees = {
    cost_per_km: feeSettings.cost_per_km ?? getDefaultFeeSettings().cost_per_km,
    service_fee: feeSettings.service_fee ?? getDefaultFeeSettings().service_fee,
    admin_fee: feeSettings.admin_fee ?? getDefaultFeeSettings().admin_fee,
    driver_share_pct: feeSettings.driver_share_pct ?? getDefaultFeeSettings().driver_share_pct,
    admin_share_pct: feeSettings.admin_share_pct ?? getDefaultFeeSettings().admin_share_pct,
    min_distance_km: feeSettings.min_distance_km ?? getDefaultFeeSettings().min_distance_km,
  };

  // Calculate distance
  const distance = (fromCoords && toCoords) 
    ? calculateDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng)
    : 0;
    
  const subtotal = 0;
  const finance = calculateOrderFinance(subtotal, distance, 0, fees, 0, !!(fromCoords && toCoords));

  const displayWeight = estimatedWeight && parseFloat(estimatedWeight) < 1 ? "1 kg" : estimatedWeight ? `${estimatedWeight} kg` : "0 kg";
  const deliveryOutlet = outlets[0]; // Fallback outlet for delivery service

  const handleGetLocation = (type: "from" | "to") => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser Anda");
      return;
    }

    if (type === "from") setIsLocatingFrom(true);
    else setIsLocatingTo(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (type === "from") {
          setFromCoords(coords);
          setIsLocatingFrom(false);
        } else {
          setToCoords(coords);
          setIsLocatingTo(false);
        }
        toast.success(`Lokasi ${type === "from" ? "Jemput" : "Antar"} berhasil diambil!`);
      },
      (err) => {
        toast.error("Gagal mengambil lokasi: " + err.message);
        if (type === "from") setIsLocatingFrom(false);
        else setIsLocatingTo(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!senderName || !senderPhone || !fromAddress || !fromCoords) {
      toast.error("Mohon lengkapi data pengirim & lokasi jemput");
      return;
    }
    if (!receiverName || !receiverPhone || !toAddress || !toCoords) {
      toast.error("Mohon lengkapi data penerima & lokasi antar");
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
      const today = new Date().toDateString();
      const todayOrderCodes = orders
        .filter(o => o.unique_payment_code && new Date(o.created_at).toDateString() === today)
        .map(o => o.unique_payment_code as number);

      const uniquePaymentCode = paymentMethod !== "cod" ? generateUniquePaymentCode(todayOrderCodes) : null;
      const finalPaymentAmount = uniquePaymentCode ? finance.total + uniquePaymentCode : finance.total;
      const paymentProvider = paymentMethod === "transfer-bri" ? "BRI" : paymentMethod === "transfer-dana" ? "DANA" : null;

      const orderId = crypto.randomUUID();

      const orderData: TablesInsert<"orders"> = {
        id: orderId,
        customer_name: senderName,
        customer_phone: senderPhone,
        customer_village: "Lokasi GPS",
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
        customer_latitude: toCoords.lat,
        customer_longitude: toCoords.lng,
        zone: finance.zone || null,
        delivery_data: {
          sender_name: senderName,
          sender_phone: senderPhone,
          from_village: "Lokasi GPS",
          from_address: fromAddress,
          from_latitude: fromCoords.lat,
          from_longitude: fromCoords.lng,
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          to_village: "Lokasi GPS",
          to_address: toAddress,
          to_latitude: toCoords.lat,
          to_longitude: toCoords.lng,
          package_category: packageCategory,
          estimated_weight: parseFloat(estimatedWeight) < 1 ? 1 : parseFloat(estimatedWeight),
          notes,
        },
      };

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

      if (paymentMethod === "cod") navigate(`/home/tracking/${newOrderId}`);
      else navigate(`/home/payment/${newOrderId}`);
    } catch (error) {
      console.error("Failed to create delivery order:", error);
      toast.error("Gagal membuat pengiriman.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20 md:pb-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/service-selection")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>

        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kirim Barang</h1>
          <p className="text-gray-600">Layanan pengantaran paket instan berbasis GPS</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Sender Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-blue-600 p-4 text-white flex items-center gap-3">
                <User className="w-5 h-5" />
                <h2 className="font-bold uppercase tracking-wider text-sm">Titik Penjemputan</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Nama Pengirim"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="No. WA Pengirim"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => handleGetLocation("from")}
                  disabled={isLocatingFrom}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold ${
                    fromCoords ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {isLocatingFrom ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  {fromCoords ? "Lokasi Jemput Terdeteksi" : "📍 Gunakan Lokasi Saya Sekarang"}
                </button>
                <textarea
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="Detail Alamat & Patokan Penjemputan"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Receiver Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-green-600 p-4 text-white flex items-center gap-3">
                <Navigation className="w-5 h-5" />
                <h2 className="font-bold uppercase tracking-wider text-sm">Titik Pengantaran</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nama Penerima"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <input
                    type="tel"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="No. WA Penerima"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-800 italic">
                  * Jika Anda berada di lokasi tujuan, klik tombol di bawah. Jika tidak, kurir akan tetap menuju alamat manual yang Anda tulis.
                </div>
                <button
                  onClick={() => handleGetLocation("to")}
                  disabled={isLocatingTo}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold ${
                    toCoords ? "bg-green-50 border-green-500 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {isLocatingTo ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  {toCoords ? "Lokasi Antar Terdeteksi" : "📍 Gunakan Lokasi Saya (di Tujuan)"}
                </button>
                <textarea
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="Detail Alamat & Patokan Tujuan"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Package Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                Informasi Barang
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Barang</label>
                  <select
                    value={packageCategory}
                    onChange={(e) => setPackageCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  >
                    <option value="">Pilih Kategori</option>
                    {PACKAGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Estimasi Berat (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={estimatedWeight}
                      onChange={(e) => setEstimatedWeight(e.target.value)}
                      placeholder="Contoh: 1.5"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Right Column - Finance */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sticky top-8 space-y-6">
              <h3 className="text-lg font-bold">Ringkasan Biaya</h3>
              
              {fromCoords && toCoords ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <div className="text-gray-400 mb-1">JARAK</div>
                      <div className="font-bold text-gray-900">{distance} KM</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <div className="text-gray-400 mb-1">ZONA</div>
                      <div className="font-bold text-gray-900">{finance.zone}</div>
                    </div>
                  </div>

                  <div className="space-y-2 py-4 border-y border-dashed border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Biaya Dasar</span>
                      <span className="font-bold">{formatCurrency(finance.zoneFee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Biaya Jarak</span>
                      <span className="font-bold">{formatCurrency(distance * fees.cost_per_km)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="font-bold text-gray-900">Total Tagihan</span>
                    <span className="text-2xl font-black text-orange-600">{formatCurrency(finance.total)}</span>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                  >
                    {isSubmitting ? "MEMPROSES..." : "BUAT PENGIRIMAN"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <MapPin className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed px-4">
                    Mohon ambil lokasi <span className="font-bold text-blue-600">Jemput</span> dan <span className="font-bold text-green-600">Antar</span> untuk menghitung ongkir.
                  </p>
                </div>
              )}

              {/* Payment Method in Summary */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Metode Pembayaran</p>
                <div className="space-y-2">
                  {["cod", "transfer-bri", "transfer-dana"].map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m as any)}
                      className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        paymentMethod === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-50 text-gray-400"
                      }`}
                    >
                      {m === "cod" ? "COD (BAYAR TUNAI)" : m === "transfer-bri" ? "TRANSFER BANK BRI" : "E-WALLET DANA"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
