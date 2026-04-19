import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTitle } from "../../hooks/useTitle";
import { ArrowLeft, MapPin, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../../contexts/CartContext";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  calculateOrderFinance,
  formatCurrency,
  getDefaultFeeSettings,
  generateUniquePaymentCode,
  calculateDistance,
} from "../../utils/financeCalculations";
import type { TablesInsert } from "../../../lib/database.types";
import { isOutletCurrentlyOpen } from "../../utils/scheduleUtils";
import { supabase } from "../../../lib/supabase";
const VILLAGE_GROUPS = [
  "Desa Bukit Sungkai",
  "Desa Sekuningan Baru",
  "Desa Balai Riam (Pusat Kecamatan)",
  "Desa Bangun Jaya",
  "Desa Lupu Peruca",
  "Desa Natai Kondang",
  "Desa Ajang"
];

export function Checkout() {
  useTitle("Checkout");

  const { items, notes, subtotal: cartSubtotal, clearCart } = useCart();
  const { addOrder, outlets, feeSettings, orders } = useData();
  const { customerPhone, username: customerName } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "transfer-bri" | "transfer-dana">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // GPS State (Fitur #55)
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDistance, setGpsDistance] = useState(0);

  // Pre-fill customer info from auth session
  useEffect(() => {
    if (customerName && !name) setName(customerName);
    if (customerPhone && !phone) setPhone(customerPhone);
  }, [customerName, customerPhone]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate("/home");
    }
  }, [items.length, navigate]);

  // Get outlet from first item (assuming all items from same store)
  const outlet = outlets.find(o => o.id === items[0]?.outletId);

  // Build FeeSettings from context data
  const fees = {
    cost_per_km: feeSettings.cost_per_km ?? getDefaultFeeSettings().cost_per_km,
    service_fee: feeSettings.service_fee ?? getDefaultFeeSettings().service_fee,
    admin_fee: feeSettings.admin_fee ?? getDefaultFeeSettings().admin_fee,
    driver_share_pct: feeSettings.driver_share_pct ?? getDefaultFeeSettings().driver_share_pct,
    admin_share_pct: feeSettings.admin_share_pct ?? getDefaultFeeSettings().admin_share_pct,
    min_distance_km: feeSettings.min_distance_km ?? getDefaultFeeSettings().min_distance_km,
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const markupAmount = items.reduce((sum, item) => sum + (item.markupAmount * item.quantity), 0);
  
  // distance is 0 if GPS not yet obtained
  const distance = customerCoords ? gpsDistance : 0;
  const finance = calculateOrderFinance(cartSubtotal, distance, markupAmount, fees);

  // Handle GPS Location (Fitur #55)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser Anda");
      return;
    }

    if (!outlet?.latitude || !outlet?.longitude) {
      toast.error("Outlet belum memiliki koordinat GPS. Hubungi Admin.");
      return;
    }

    setIsLocating(true);
    toast.info("Mengambil lokasi Anda...");
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomerCoords({ lat, lng });
        
        // Calculate distance to outlet
        const dist = calculateDistance(lat, lng, Number(outlet.latitude), Number(outlet.longitude));
        setGpsDistance(dist);
        setIsLocating(false);
        toast.success(`Lokasi terdeteksi! Jarak: ${dist} KM`);
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error("Gagal mengambil lokasi: " + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOrder = async () => {
    if (!name || !phone || !village || !address) {
      toast.error("Mohon lengkapi data pemesan");
      return;
    }

    if (!customerCoords) {
      toast.error("Mohon klik tombol 'Gunakan Lokasi Saya' untuk menghitung ongkir");
      return;
    }

    if (!outlet) {
      toast.error("Outlet tidak ditemukan");
      return;
    }

    if (outlet.is_active === false) {
      toast.error("Mohon maaf, outlet ini sedang tidak aktif/dihapus.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Re-validate outlet status right before creating order using FRESH SERVER DATA
      const { data: freshOutlet, error: outletError } = await supabase
        .from('outlets')
        .select('*')
        .eq('id', outlet.id)
        .single();
        
      const { data: serverTimeStr, error: timeError } = await supabase.rpc('get_server_time');

      if (outletError || !freshOutlet || timeError || !serverTimeStr) {
        toast.error("Koneksi tidak stabil. Gagal memvalidasi status outlet.");
        setIsSubmitting(false);
        return;
      }

      const serverDate = new Date(serverTimeStr);

      if (!isOutletCurrentlyOpen(freshOutlet as any, serverDate)) {
        toast.error("Mohon maaf, outlet baru saja tutup. Pesanan tidak dapat dilanjutkan.");
        navigate(`/home/store/${outlet.id}`);
        setIsSubmitting(false);
        return;
      }

      const today = new Date().toDateString();
      const todayOrderCodes = orders
        .filter(o => o.unique_payment_code && new Date(o.created_at).toDateString() === today)
        .map(o => o.unique_payment_code as number);

      const uniquePaymentCode = paymentMethod !== "cod"
        ? generateUniquePaymentCode(todayOrderCodes)
        : null;

      const finalPaymentAmount = uniquePaymentCode
        ? finance.total + uniquePaymentCode
        : finance.total;

      const paymentProvider = paymentMethod === "transfer-bri" ? "BRI" : paymentMethod === "transfer-dana" ? "DANA" : null;

      // Build order data
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
        service_fee: markupAmount,
        admin_fee: finance.adminFee,
        total: finance.total,
        payment_method: paymentMethod === "cod" ? "cod" : "transfer",
        payment_provider: paymentProvider,
        unique_payment_code: uniquePaymentCode,
        final_payment_amount: finalPaymentAmount,
        payment_status: paymentMethod === "cod" ? "pending" : "awaiting_admin_confirmation",
        status: "pending",
        is_manual_order: false,
        is_delivery_service: false,
        customer_latitude: customerCoords.lat,
        customer_longitude: customerCoords.lng,
        zone: finance.zone || null,
        customer_note: notes || null,
      };

      const orderItems: TablesInsert<"order_items">[] = items.map(item => ({
        order_id: orderData.id!,
        product_id: item.productId || null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        markup_amount: item.markupAmount,
        item_total: item.price * item.quantity,
        selected_variant: item.selectedVariant?.name ?? null,
        selected_extras: (item.selectedExtras || []).map(e => e.name),
        note: item.note || null,
      }));

      const orderId = await addOrder(orderData, orderItems);
      clearCart();

      if (paymentMethod === "cod") {
        navigate(`/home/tracking/${orderId}`);
      } else {
        navigate(`/home/payment/${orderId}`);
      }
    } catch (error: any) {
      console.error("Failed to create order:", error);
      toast.error(`Error: ${error?.message || "Gagal membuat pesanan"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20 md:pb-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/home/cart")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Keranjang</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-orange-500" />
                Informasi Pengiriman
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama penerima pesanan"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nomor Telepon (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lokasi Presisi <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all font-bold ${
                      customerCoords 
                        ? "bg-green-50 border-green-500 text-green-700" 
                        : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                    }`}
                  >
                    {isLocating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                    {customerCoords ? "Lokasi Berhasil Diambil" : "📍 Gunakan Lokasi Saya"}
                  </button>
                  <p className="text-[11px] text-gray-500 mt-2 italic text-center">
                    * Wajib klik tombol di atas agar kurir tahu posisi Anda & ongkir terhitung otomatis.
                  </p>
                </div>

                {customerCoords && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between text-xs text-blue-700 font-bold uppercase tracking-wider mb-3">
                      <span>Rincian Jarak & Zona</span>
                      <span className="px-2 py-0.5 bg-blue-100 rounded-full">GPS Aktif</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                        <div className="text-[10px] text-gray-400 font-medium mb-1">JARAK</div>
                        <div className="text-sm font-bold text-gray-900">{gpsDistance} KM</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                        <div className="text-[10px] text-gray-400 font-medium mb-1">ZONA</div>
                        <div className="text-sm font-bold text-gray-900">{finance.zone}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm text-center border-l-4 border-orange-400">
                        <div className="text-[10px] text-gray-400 font-medium mb-1">ONGKIR</div>
                        <div className="text-sm font-bold text-orange-600">{formatCurrency(finance.deliveryFee)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-blue-600/70 text-center leading-relaxed">
                      Perhitungan: Biaya Zona {finance.zone} ({formatCurrency(finance.zoneFee || 0)}) + Jarak ({gpsDistance} km x {formatCurrency(fees.cost_per_km)})
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Desa Tempat Tinggal
                  </label>
                  <select
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none bg-white"
                  >
                    <option value="">Pilih Desa...</option>
                    {VILLAGE_GROUPS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alamat Lengkap & Patokan
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: Rumah cat biru depan Masjid Al-Ikhlas"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Metode Pembayaran</h2>
              <div className="space-y-3">
                {[
                  { id: "cod", label: "Cash on Delivery (COD)", sub: "Bayar tunai ke kurir saat sampai" },
                  { id: "transfer-bri", label: "Transfer Bank BRI", sub: "Transfer ke rekening admin" },
                  { id: "transfer-dana", label: "E-Wallet Dana", sub: "Bayar via aplikasi Dana" },
                ].map((m) => (
                  <label 
                    key={m.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === m.id ? "border-orange-500 bg-orange-50/30" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={paymentMethod === m.id}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500 border-gray-300"
                    />
                    <div>
                      <div className="font-bold text-gray-900">{m.label}</div>
                      <div className="text-xs text-gray-500">{m.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Ringkasan Pesanan</h2>

              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex justify-between items-start gap-4 text-sm">
                    <div className="flex-1">
                      <div className="text-gray-900 font-bold leading-tight mb-1">
                        {item.name} <span className="text-orange-600">x{item.quantity}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1 italic">
                        {item.outletName}
                      </div>
                    </div>
                    <div className="text-gray-900 font-bold whitespace-nowrap">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-dashed border-gray-200 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal Makanan</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(finance.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ongkos Kirim (GPS)</span>
                  <span className="text-gray-900 font-medium">
                    {finance.deliveryFee > 15000 ? (
                      <div className="text-right">
                        <span className="line-through text-gray-400 text-[11px] mr-1">
                          {formatCurrency(Math.round(finance.deliveryFee * 1.15 / 1000) * 1000)}
                        </span>
                        <span>{formatCurrency(finance.deliveryFee)}</span>
                      </div>
                    ) : (
                      formatCurrency(finance.deliveryFee)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-900 text-lg">Total Bayar</span>
                <span className="text-2xl font-black text-orange-600 leading-none">
                  {formatCurrency(finance.total)}
                </span>
              </div>

              <button
                onClick={handleOrder}
                disabled={isSubmitting || !customerCoords}
                className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  "Konfirmasi Pesanan"
                )}
              </button>
              
              {!customerCoords && (
                <p className="text-center text-red-500 text-[11px] mt-4 font-medium animate-pulse">
                  ⚠️ Mohon ambil lokasi GPS untuk melanjutkan
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
