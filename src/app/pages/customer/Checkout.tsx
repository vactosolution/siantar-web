import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useData, Village } from "../../contexts/DataContext";
import { calculateOrderFinance, formatCurrency } from "../../utils/financeCalculations";

const VILLAGES: Village[] = [
  "Desa Air Dua",
  "Desa Balai Riam (Pusat Kecamatan)",
  "Desa Bangun Jaya",
  "Desa Bukit Sungkai",
  "Desa Jihing (Jihing Janga area)",
  "Desa Lupu Peruca",
  "Desa Pempaning",
  "Desa Sekuningan Baru",
];

export function Checkout() {
  const { items, clearCart } = useCart();
  const { addOrder, outlets, getDistance } = useData();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState<Village | "">("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "transfer-bri" | "transfer-dana">("cod");

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate("/home");
    }
  }, [items.length, navigate]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Get outlet from first item (assuming all items from same store)
  const outlet = outlets.find(o => o.name === items[0]?.storeName);
  
  // Calculate distance based on villages
  const distance = village && outlet ? getDistance(village, outlet.village) : 0;

  const finance = calculateOrderFinance(subtotal, distance);

  const handleOrder = () => {
    if (!name || !phone || !village || !address) {
      alert("Mohon lengkapi semua data");
      return;
    }

    if (!outlet) {
      alert("Outlet tidak ditemukan");
      return;
    }

    // Validate single-store order (all items must be from same store)
    const uniqueStores = new Set(items.map(item => item.storeName));
    if (uniqueStores.size > 1) {
      alert("Pesanan harus dari satu toko yang sama");
      return;
    }

    // Generate unique 3-digit payment code for transfer payments
    const uniquePaymentCode = paymentMethod !== "cod" 
      ? Math.floor(100 + Math.random() * 900)  // Random 3-digit number (100-999)
      : undefined;

    const finalPaymentAmount = uniquePaymentCode 
      ? finance.total + uniquePaymentCode
      : finance.total;

    // Determine payment provider and status
    const paymentProvider = paymentMethod === "transfer-bri" ? "BRI" : paymentMethod === "transfer-dana" ? "DANA" : undefined;
    const paymentStatus = paymentMethod === "cod" ? undefined : "pending";
    const orderStatus = paymentMethod === "cod" ? "pending" : "pending" as const;

    // Create order data with proper distance calculation
    const orderData = {
      customerName: name,
      customerPhone: phone,
      customerVillage: village,
      address,
      outlet: outlet,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        selectedExtras: item.selectedExtras,
      })),
      subtotal,
      distance, // Actual distance
      chargedDistance: finance.chargedDistance, // Distance used for calculation (min 1 km)
      isMinimumChargeApplied: finance.isMinimumChargeApplied, // Whether minimum charge was applied
      deliveryFee: finance.deliveryFee,
      serviceFee: finance.serviceFee,
      total: finance.total,
      paymentMethod: (paymentMethod === "cod" ? "cod" : "transfer") as "cod" | "transfer",
      paymentProvider,
      uniquePaymentCode,
      finalPaymentAmount,
      paymentStatus,
      status: orderStatus,
      timestamp: new Date().toISOString(),
    };
    
    // Validate delivery fee calculation
    const expectedDeliveryFee = Math.max(distance, 1) * 2000;
    if (finance.deliveryFee !== expectedDeliveryFee) {
      alert("Error: Perhitungan biaya pengiriman tidak valid");
      return;
    }
    
    const orderId = addOrder(orderData);
    
    clearCart();
    
    // Redirect based on payment method
    if (paymentMethod === "cod") {
      navigate(`/home/tracking/${orderId}`);
    } else {
      // Redirect to payment instruction page
      navigate(`/home/payment/${orderId}`);
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
                      Biaya pengiriman dihitung Rp 2.000/km
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
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <div className="text-gray-900">
                        {item.name} x{item.quantity}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {item.storeName}
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
                    {formatCurrency(finance.deliveryFee)}
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
                className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
              >
                Pesan Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}