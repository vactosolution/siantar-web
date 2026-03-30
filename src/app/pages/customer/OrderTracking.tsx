import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Phone, CheckCircle2, Clock, Truck, MapPin, Package, Navigation, Bell, CreditCard, AlertCircle, MessageCircle } from "lucide-react";
import { useData, OrderStatus } from "../../contexts/DataContext";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Logo } from "../../components/Logo";

const orderStatuses: Array<{ id: OrderStatus; label: string; icon: typeof Clock; description: string }> = [
  { id: "processing", label: "Diproses", icon: Clock, description: "Pesanan sedang diproses admin" },
  { id: "going-to-store", label: "Driver menuju toko", icon: MapPin, description: "Driver dalam perjalanan ke toko" },
  { id: "picked-up", label: "Pesanan diambil", icon: Package, description: "Pesanan sudah diambil dari toko" },
  { id: "on-delivery", label: "Dalam perjalanan", icon: Truck, description: "Driver sedang mengantar pesanan" },
  { id: "completed", label: "Selesai", icon: CheckCircle2, description: "Pesanan telah sampai" },
];

export function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { orders, drivers } = useData();
  const [currentOrder, setCurrentOrder] = useState(orders.find(o => o.id === orderId) || orders[0]);
  const [previousStatus, setPreviousStatus] = useState(currentOrder?.status);
  const [driverLocation, setDriverLocation] = useState(0); // 0-100 progress

  // Auto-refresh every 3 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedOrder = orders.find(o => o.id === orderId) || orders[0];
      if (updatedOrder) {
        // Check if status changed for notification
        if (previousStatus && updatedOrder.status !== previousStatus) {
          // Trigger notification
          const statusInfo = orderStatuses.find(s => s.id === updatedOrder.status);
          if (statusInfo) {
            toast.success(statusInfo.label, {
              description: statusInfo.description,
              icon: <Bell className="w-5 h-5" />,
              duration: 5000,
            });
          }
        }
        setPreviousStatus(updatedOrder.status);
        setCurrentOrder(updatedOrder);
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [orderId, orders, previousStatus]);

  // Simulate driver location progress based on status
  useEffect(() => {
    if (!currentOrder) return;
    
    const statusProgress: Record<OrderStatus, number> = {
      "pending": 0,
      "processing": 10,
      "going-to-store": 30,
      "picked-up": 50,
      "on-delivery": 75,
      "completed": 100,
    };

    const targetProgress = statusProgress[currentOrder.status] || 0;
    
    // Animate progress
    const step = targetProgress > driverLocation ? 1 : -1;
    const interval = setInterval(() => {
      setDriverLocation(prev => {
        if (Math.abs(prev - targetProgress) < 1) {
          clearInterval(interval);
          return targetProgress;
        }
        return prev + step;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [currentOrder?.status]);

  if (!currentOrder) {
    return (
      <div className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Home</span>
          </Link>
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">Order tidak ditemukan</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusIndex = orderStatuses.findIndex(s => s.id === currentOrder.status);
  const driver = currentOrder.driverId ? drivers.find(d => d.id === currentOrder.driverId) : null;

  return (
    <div className="pb-20 md:pb-8 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/home/history"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Lihat Semua Pesanan</span>
        </Link>

        {/* Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 mb-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                Lacak Pesanan
              </h1>
              <p className="text-orange-100 mt-1">
                Order ID: #{currentOrder.id}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                currentOrder.status === "completed"
                  ? "bg-green-500 text-white"
                  : "bg-white text-orange-600"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  currentOrder.status === "completed" ? "bg-white" : "bg-orange-600 animate-pulse"
                }`} />
                <span className="font-medium">
                  {currentOrder.status === "completed" ? "Selesai" : "Aktif"}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-orange-100 text-sm mb-1">Dari</p>
              <p className="font-semibold">{currentOrder.outlet.name}</p>
              <p className="text-sm text-orange-100">{currentOrder.outlet.village}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-orange-100 text-sm mb-1">Ke</p>
              <p className="font-semibold">{currentOrder.customerName}</p>
              <p className="text-sm text-orange-100">{currentOrder.customerVillage}</p>
            </div>
          </div>
        </motion.div>

        {/* Payment Instruction Button for Transfer Orders */}
        {currentOrder.paymentMethod === "transfer" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            <button
              onClick={() => navigate(`/home/payment/${currentOrder.id}`)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg mb-1">Instruksi Pembayaran</div>
                    <div className="text-blue-100 text-sm">
                      {currentOrder.paymentStatus === "waiting_confirmation" 
                        ? "Menunggu konfirmasi admin"
                        : currentOrder.paymentStatus === "confirmed"
                        ? "✓ Pembayaran terkonfirmasi"
                        : "Lihat detail transfer & upload bukti"}
                    </div>
                  </div>
                </div>
                <div className="text-white">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
            </button>
          </motion.div>
        )}

        {/* Map Placeholder with Driver Movement */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6 overflow-hidden"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-500" />
            Live Tracking
          </h3>
          
          {/* Simplified Map View */}
          <div className="relative h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl overflow-hidden">
            {/* Route Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 -translate-y-1/2">
              <motion.div 
                className="h-full bg-orange-500"
                initial={{ width: "0%" }}
                animate={{ width: `${driverLocation}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            {/* Store Icon (Start) */}
            <motion.div 
              className="absolute left-8 top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg border-4 border-blue-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Package className="w-6 h-6 text-blue-500" />
            </motion.div>
            
            {/* Driver Icon (Moving) */}
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              initial={{ left: "8%" }}
              animate={{ left: `${8 + (driverLocation * 0.84)}%` }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="bg-orange-500 p-3 rounded-full shadow-xl border-4 border-white">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                {currentOrder.status !== "completed" && (
                  <div className="absolute -top-1 -right-1">
                    <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Customer Icon (End) */}
            <motion.div 
              className="absolute right-8 top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-lg border-4 border-green-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <MapPin className="w-6 h-6 text-green-500" />
            </motion.div>

            {/* Progress Text */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
              <p className="text-sm font-medium text-gray-700">
                Progress: {Math.round(driverLocation)}%
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <h3 className="font-semibold text-gray-900 mb-6">Status Pesanan</h3>
          
          <div className="relative py-4">
            {orderStatuses.map((status, index) => {
              const Icon = status.icon;
              const isCompleted = index <= currentStatusIndex;
              const isActive = status.id === currentOrder.status;

              return (
                <motion.div 
                  key={status.id} 
                  className="relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Connector Line */}
                  {index < orderStatuses.length - 1 && (
                    <div
                      className={`absolute left-6 top-14 w-0.5 h-20 transition-all duration-500 ${
                        isCompleted ? "bg-orange-500" : "bg-gray-300"
                      }`}
                    />
                  )}

                  {/* Status Item */}
                  <div className="flex items-start gap-4 mb-4">
                    <motion.div
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      } ${isActive ? "ring-4 ring-orange-100 scale-110" : ""}`}
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                    >
                      <Icon className="w-6 h-6" />
                    </motion.div>
                    <div className="flex-1 pt-2">
                      <div
                        className={`font-semibold text-lg ${
                          isCompleted ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {status.label}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {status.description}
                      </p>
                      {isActive && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="inline-flex items-center gap-2 mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full"
                        >
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          Sedang berlangsung
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Driver Info */}
        {driver && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />
              Informasi Driver
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">{driver.name}</div>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{driver.phone}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        currentOrder.status === "going-to-store" 
                          ? "bg-blue-100 text-blue-700"
                          : currentOrder.status === "on-delivery"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        <Navigation className="w-3 h-3" />
                        {currentOrder.status === "going-to-store" 
                          ? "Menuju toko"
                          : currentOrder.status === "on-delivery"
                          ? "Sedang mengantar"
                          : "Siap mengantar"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Buttons */}
              {currentOrder.status !== "pending" && (
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`tel:${driver.phone}`}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Telepon
                  </a>
                  <a
                    href={`https://wa.me/${driver.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Halo ${driver.name}, saya ${currentOrder.customerName}.\n\nSaya ingin menanyakan pesanan saya:\nOrder ID: ${currentOrder.id}\nTujuan: ${currentOrder.customerVillage}\n\nTerima kasih!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentOrder.status === "pending" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Menunggu Konfirmasi</h4>
                <p className="text-sm text-yellow-800">
                  Pesanan Anda sedang menunggu untuk diproses oleh admin. Driver akan segera ditugaskan.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Order Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Detail Pesanan</h3>
          <div className="space-y-3">
            {currentOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.name} x{item.quantity}
                </span>
                <span className="text-gray-900 font-medium">
                  Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">Rp {currentOrder.subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Biaya Layanan</span>
                <span className="text-gray-900">Rp {currentOrder.serviceFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-600">Biaya Pengiriman</span>
                <span className="text-gray-900">Rp {currentOrder.deliveryFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span className="text-gray-900">Total</span>
                <span className="text-orange-600">Rp {currentOrder.total.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}