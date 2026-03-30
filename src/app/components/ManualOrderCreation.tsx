import { useState, useEffect } from "react";
import { useData, Village, Order, Product, ProductExtra, ProductSize } from "../contexts/DataContext";
import { calculateOrderFinance, formatCurrency } from "../utils/financeCalculations";
import { 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User, 
  Phone, 
  MapPin, 
  FileText,
  Store,
  Package,
  DollarSign,
  Copy,
  ExternalLink,
  Send,
  Check
} from "lucide-react";
import { toast } from "sonner";

interface ManualOrderItem {
  product: Product;
  quantity: number;
  selectedSize?: ProductSize;
  selectedExtras: ProductExtra[];
  itemTotal: number;
}

interface ManualOrderCreationProps {
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

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

export function ManualOrderCreation({ onClose, onOrderCreated }: ManualOrderCreationProps) {
  const { outlets, products, getProductsByOutlet, addOrder, getDistance } = useData();

  // Step state
  const [currentStep, setCurrentStep] = useState<"customer" | "outlet" | "items" | "review">("customer");

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerVillage, setCustomerVillage] = useState<Village | "">("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Outlet selection
  const [selectedOutlet, setSelectedOutlet] = useState<typeof outlets[0] | null>(null);

  // Order items
  const [orderItems, setOrderItems] = useState<ManualOrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(undefined);
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "transfer">("cod");
  const [paymentProvider, setPaymentProvider] = useState<"BRI" | "DANA" | undefined>(undefined);

  // Frequently used customer data (localStorage)
  const [savedCustomers, setSavedCustomers] = useState<Array<{
    name: string;
    phone: string;
    village: Village;
    address: string;
  }>>(() => {
    const saved = localStorage.getItem("sianter_saved_customers");
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate current item price
  const calculateItemPrice = () => {
    if (!selectedProduct) return 0;
    const basePrice = selectedProduct.discountPrice || selectedProduct.price;
    const sizePrice = selectedSize ? selectedSize.priceAdjustment : 0;
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    return (basePrice + sizePrice + extrasPrice) * quantity;
  };

  // Add item to order
  const addItemToOrder = () => {
    if (!selectedProduct) return;

    const newItem: ManualOrderItem = {
      product: selectedProduct,
      quantity,
      selectedSize,
      selectedExtras: [...selectedExtras],
      itemTotal: calculateItemPrice(),
    };

    setOrderItems([...orderItems, newItem]);
    
    // Reset item selection
    setSelectedProduct(null);
    setSelectedSize(undefined);
    setSelectedExtras([]);
    setQuantity(1);

    toast.success("Item ditambahkan ke pesanan");
  };

  // Remove item from order
  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
    toast.info("Item dihapus dari pesanan");
  };

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const distance = customerVillage && selectedOutlet ? getDistance(customerVillage, selectedOutlet.village) : 0;
  const finance = calculateOrderFinance(subtotal, distance);
  
  // Generate unique payment code for transfer
  const uniquePaymentCode = paymentMethod === "transfer" ? Math.floor(100 + Math.random() * 900) : undefined;
  const finalPaymentAmount = uniquePaymentCode ? finance.total + uniquePaymentCode : finance.total;

  // Handle customer data autofill
  const handleCustomerSelect = (customer: typeof savedCustomers[0]) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerVillage(customer.village);
    setCustomerAddress(customer.address);
    toast.success("Data pelanggan diisi otomatis");
  };

  // Save customer for future use
  const saveCustomerData = () => {
    if (!customerName || !customerPhone || !customerVillage || !customerAddress) return;

    const customerData = {
      name: customerName,
      phone: customerPhone,
      village: customerVillage as Village,
      address: customerAddress,
    };

    // Check if customer already exists
    const existingIndex = savedCustomers.findIndex(
      c => c.phone === customerPhone
    );

    let updatedCustomers;
    if (existingIndex >= 0) {
      // Update existing
      updatedCustomers = [...savedCustomers];
      updatedCustomers[existingIndex] = customerData;
    } else {
      // Add new (keep max 10 recent customers)
      updatedCustomers = [customerData, ...savedCustomers].slice(0, 10);
    }

    setSavedCustomers(updatedCustomers);
    localStorage.setItem("sianter_saved_customers", JSON.stringify(updatedCustomers));
  };

  // Create order
  const createOrder = () => {
    if (!selectedOutlet || !customerVillage || orderItems.length === 0) {
      toast.error("Data pesanan tidak lengkap");
      return;
    }

    // Save customer data for future use
    saveCustomerData();

    const orderData = {
      customerName,
      customerPhone,
      customerVillage: customerVillage as Village,
      address: customerAddress,
      outlet: selectedOutlet,
      items: orderItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.itemTotal / item.quantity,
        selectedSize: item.selectedSize?.name,
        selectedExtras: item.selectedExtras.map(e => e.name),
      })),
      subtotal,
      distance,
      chargedDistance: finance.chargedDistance,
      isMinimumChargeApplied: finance.isMinimumChargeApplied,
      deliveryFee: finance.deliveryFee,
      serviceFee: finance.serviceFee,
      total: finance.total,
      paymentMethod,
      paymentProvider,
      uniquePaymentCode,
      finalPaymentAmount,
      paymentStatus: paymentMethod === "cod" ? undefined : ("pending" as const),
      status: "pending" as const,
      timestamp: new Date().toISOString(),
      isManualOrder: true, // Mark as manual order
    };

    const orderId = addOrder(orderData as any);
    
    toast.success("Pesanan manual berhasil dibuat!", {
      description: `Order ID: ${orderId}`,
      duration: 5000,
    });

    onOrderCreated(orderId);
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = () => {
    if (!selectedOutlet) return "";

    const trackingLink = `${window.location.origin}/home/tracking/${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    let message = `*PESANAN SIANTER*\n\n`;
    message += `Halo ${customerName},\n\n`;
    message += `Pesanan Anda telah kami terima:\n\n`;
    message += `📍 *Dari:* ${selectedOutlet.name}\n`;
    message += `📦 *Detail Pesanan:*\n`;
    
    orderItems.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name}`;
      if (item.selectedSize) message += ` (${item.selectedSize.name})`;
      if (item.selectedExtras.length > 0) {
        message += ` + ${item.selectedExtras.map(e => e.name).join(", ")}`;
      }
      message += ` x${item.quantity} - ${formatCurrency(item.itemTotal)}\n`;
    });
    
    message += `\n💰 *Rincian Pembayaran:*\n`;
    message += `Subtotal: ${formatCurrency(subtotal)}\n`;
    message += `Biaya Layanan: ${formatCurrency(finance.serviceFee)}\n`;
    message += `Biaya Kirim (${finance.chargedDistance}km): ${formatCurrency(finance.deliveryFee)}\n`;
    message += `*Total: ${formatCurrency(finance.total)}*\n\n`;

    if (paymentMethod === "transfer" && paymentProvider && uniquePaymentCode) {
      message += `💳 *Pembayaran Transfer ${paymentProvider}*\n`;
      message += `Jumlah yang harus dibayar: *${formatCurrency(finalPaymentAmount)}*\n`;
      message += `(Termasuk kode unik: ${uniquePaymentCode})\n\n`;
      
      if (paymentProvider === "BRI") {
        message += `Rekening BRI: 1234-5678-9012-3456\n`;
        message += `a.n. SiAnter Delivery\n\n`;
      } else {
        message += `DANA: 0812-3456-7890\n`;
        message += `a.n. SiAnter Delivery\n\n`;
      }
      
      message += `Setelah transfer, mohon kirim bukti pembayaran.\n\n`;
    } else {
      message += `💵 *Pembayaran: Cash on Delivery (COD)*\n\n`;
    }
    
    message += `🔗 *Lacak pesanan Anda:*\n${trackingLink}\n\n`;
    message += `Terima kasih telah menggunakan SiAnter! 🚀`;

    return encodeURIComponent(message);
  };

  // Copy tracking link
  const copyTrackingLink = () => {
    const trackingLink = `${window.location.origin}/home/tracking/ORDERID`;
    navigator.clipboard.writeText(trackingLink);
    toast.success("Link tracking disalin!");
  };

  // Get available products for selected outlet
  const availableProducts = selectedOutlet ? getProductsByOutlet(selectedOutlet.id).filter(p => p.isAvailable) : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Buat Pesanan Manual</h2>
            <p className="text-sm text-gray-500 mt-1">Admin-assisted ordering untuk WhatsApp orders</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 p-6 border-b border-gray-200">
          {[
            { id: "customer", label: "Data Customer", icon: User },
            { id: "outlet", label: "Pilih Outlet", icon: Store },
            { id: "items", label: "Pilih Menu", icon: ShoppingCart },
            { id: "review", label: "Review & Submit", icon: FileText },
          ].map((step, index) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isPast = ["customer", "outlet", "items", "review"].indexOf(currentStep) > index;
            
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isCurrent
                      ? "bg-[#FF6A00] text-white"
                      : isPast
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 ${isPast ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Customer Details */}
          {currentStep === "customer" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Pelanggan</h3>

                {/* Saved Customers Quick Select */}
                {savedCustomers.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-3">Pelanggan Tersimpan:</p>
                    <div className="flex flex-wrap gap-2">
                      {savedCustomers.map((customer, index) => (
                        <button
                          key={index}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors"
                        >
                          {customer.name} - {customer.phone}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Pelanggan *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Masukkan nama pelanggan"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Telepon *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08xx-xxxx-xxxx"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desa *
                    </label>
                    <select
                      value={customerVillage}
                      onChange={(e) => setCustomerVillage(e.target.value as Village)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                    >
                      <option value="">Pilih desa</option>
                      {VILLAGES.map((village) => (
                        <option key={village} value={village}>
                          {village}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat Lengkap *
                    </label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Masukkan alamat lengkap (RT/RW, patokan)"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!customerName || !customerPhone || !customerVillage || !customerAddress) {
                    toast.error("Mohon lengkapi semua data pelanggan");
                    return;
                  }
                  setCurrentStep("outlet");
                }}
                className="w-full bg-[#FF6A00] text-white py-3 rounded-lg font-medium hover:bg-[#FF6A00]/90 transition-colors"
              >
                Lanjut ke Pilih Outlet
              </button>
            </div>
          )}

          {/* Step 2: Outlet Selection */}
          {currentStep === "outlet" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pilih Outlet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Customer: {customerName} - {customerVillage}
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {outlets.map((outlet) => {
                    const distanceToCustomer = customerVillage ? getDistance(customerVillage as Village, outlet.village) : 0;
                    const isSelected = selectedOutlet?.id === outlet.id;

                    return (
                      <button
                        key={outlet.id}
                        onClick={() => setSelectedOutlet(outlet)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? "border-[#FF6A00] bg-[#FF6A00]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{outlet.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{outlet.village}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                {outlet.category === "food" ? "🍽️ Makanan" : outlet.category === "drink" ? "☕ Minuman" : "📦 Paket"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {distanceToCustomer} km
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-6 h-6 text-[#FF6A00]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep("customer")}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={() => {
                    if (!selectedOutlet) {
                      toast.error("Pilih outlet terlebih dahulu");
                      return;
                    }
                    setCurrentStep("items");
                  }}
                  className="flex-1 bg-[#FF6A00] text-white py-3 rounded-lg font-medium hover:bg-[#FF6A00]/90 transition-colors"
                >
                  Lanjut ke Pilih Menu
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Menu Selection */}
          {currentStep === "items" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pilih Menu</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Outlet: {selectedOutlet?.name}
                </p>

                {/* Current Order Items */}
                {orderItems.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">Item Pesanan ({orderItems.length})</h4>
                    <div className="space-y-2">
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.product.name}
                              {item.selectedSize && ` (${item.selectedSize.name})`}
                            </p>
                            {item.selectedExtras.length > 0 && (
                              <p className="text-sm text-gray-500">
                                + {item.selectedExtras.map(e => e.name).join(", ")}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              {item.quantity}x @ {formatCurrency(item.itemTotal / item.quantity)} = {formatCurrency(item.itemTotal)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-green-200">
                        <p className="font-semibold text-green-900">
                          Subtotal: {formatCurrency(subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih Produk
                    </label>
                    <select
                      value={selectedProduct?.id || ""}
                      onChange={(e) => {
                        const product = availableProducts.find(p => p.id === e.target.value);
                        setSelectedProduct(product || null);
                        setSelectedSize(undefined);
                        setSelectedExtras([]);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"
                    >
                      <option value="">Pilih produk</option>
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.discountPrice || product.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProduct && (
                    <>
                      {/* Size Selection */}
                      {selectedProduct.sizes.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ukuran
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.sizes.map((size) => (
                              <button
                                key={size.id}
                                onClick={() => setSelectedSize(size)}
                                className={`px-4 py-2 border-2 rounded-lg transition-colors ${
                                  selectedSize?.id === size.id
                                    ? "border-[#FF6A00] bg-[#FF6A00]/5 text-[#FF6A00]"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                {size.name}
                                {size.priceAdjustment > 0 && (
                                  <span className="ml-2 text-sm">+{formatCurrency(size.priceAdjustment)}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extras Selection */}
                      {selectedProduct.extras.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Extras (Opsional)
                          </label>
                          <div className="space-y-2">
                            {selectedProduct.extras.map((extra) => {
                              const isSelected = selectedExtras.some(e => e.id === extra.id);
                              return (
                                <button
                                  key={extra.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
                                    } else {
                                      setSelectedExtras([...selectedExtras, extra]);
                                    }
                                  }}
                                  className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
                                    isSelected
                                      ? "border-[#FF6A00] bg-[#FF6A00]/5"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{extra.name}</span>
                                    <span className="text-sm">+{formatCurrency(extra.price)}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jumlah
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                          <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Total Item:</span>
                          <span className="text-xl font-bold text-[#FF6A00]">
                            {formatCurrency(calculateItemPrice())}
                          </span>
                        </div>
                      </div>

                      {/* Add Item Button */}
                      <button
                        onClick={addItemToOrder}
                        className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Tambah ke Pesanan
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep("outlet")}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={() => {
                    if (orderItems.length === 0) {
                      toast.error("Tambahkan minimal 1 item ke pesanan");
                      return;
                    }
                    setCurrentStep("review");
                  }}
                  className="flex-1 bg-[#FF6A00] text-white py-3 rounded-lg font-medium hover:bg-[#FF6A00]/90 transition-colors"
                >
                  Review Pesanan ({orderItems.length} item)
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === "review" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Pesanan</h3>

                {/* Customer Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Data Pelanggan</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nama:</span> {customerName}</p>
                    <p><span className="font-medium">Telepon:</span> {customerPhone}</p>
                    <p><span className="font-medium">Desa:</span> {customerVillage}</p>
                    <p><span className="font-medium">Alamat:</span> {customerAddress}</p>
                  </div>
                </div>

                {/* Outlet Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Outlet</h4>
                  <p className="text-sm">{selectedOutlet?.name} - {selectedOutlet?.village}</p>
                  <p className="text-xs text-gray-500 mt-1">Jarak: {distance} km</p>
                </div>

                {/* Order Items */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Item Pesanan</h4>
                  <div className="space-y-2">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.product.name}
                            {item.selectedSize && ` (${item.selectedSize.name})`}
                          </p>
                          {item.selectedExtras.length > 0 && (
                            <p className="text-xs text-gray-500">
                              + {item.selectedExtras.map(e => e.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <p className="font-medium">
                          {item.quantity}x {formatCurrency(item.itemTotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metode Pembayaran
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setPaymentMethod("cod");
                        setPaymentProvider(undefined);
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        paymentMethod === "cod"
                          ? "border-[#FF6A00] bg-[#FF6A00]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-medium">💵 Cash on Delivery (COD)</p>
                      <p className="text-xs text-gray-500 mt-1">Bayar saat pesanan sampai</p>
                    </button>

                    <button
                      onClick={() => setPaymentMethod("transfer")}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        paymentMethod === "transfer"
                          ? "border-[#FF6A00] bg-[#FF6A00]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-medium">💳 Transfer Bank/E-Wallet</p>
                      <p className="text-xs text-gray-500 mt-1">BRI atau DANA</p>
                    </button>
                  </div>

                  {paymentMethod === "transfer" && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentProvider("BRI")}
                        className={`p-3 border-2 rounded-lg transition-colors ${
                          paymentProvider === "BRI"
                            ? "border-[#FF6A00] bg-[#FF6A00]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-center">🏦 BRI</p>
                      </button>
                      <button
                        onClick={() => setPaymentProvider("DANA")}
                        className={`p-3 border-2 rounded-lg transition-colors ${
                          paymentProvider === "DANA"
                            ? "border-[#FF6A00] bg-[#FF6A00]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-center">💰 DANA</p>
                      </button>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-gradient-to-br from-[#FF6A00]/10 to-[#FF6A00]/5 rounded-lg border-2 border-[#FF6A00]/20">
                  <h4 className="font-semibold text-gray-900 mb-3">Rincian Pembayaran</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya Layanan</span>
                      <span>{formatCurrency(finance.serviceFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya Kirim ({finance.chargedDistance} km)</span>
                      <span>{formatCurrency(finance.deliveryFee)}</span>
                    </div>
                    {finance.isMinimumChargeApplied && (
                      <p className="text-xs text-gray-500">
                        * Minimum biaya kirim 1 km
                      </p>
                    )}
                    <div className="pt-2 border-t border-[#FF6A00]/20">
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span className="text-[#FF6A00]">{formatCurrency(finance.total)}</span>
                      </div>
                    </div>
                    {paymentMethod === "transfer" && uniquePaymentCode && (
                      <>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Kode Unik</span>
                          <span>+{uniquePaymentCode}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-[#FF6A00]">
                          <span>Total Transfer</span>
                          <span>{formatCurrency(finalPaymentAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep("items")}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={createOrder}
                  disabled={paymentMethod === "transfer" && !paymentProvider}
                  className="flex-1 bg-[#FF6A00] text-white py-3 rounded-lg font-medium hover:bg-[#FF6A00]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buat Pesanan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
