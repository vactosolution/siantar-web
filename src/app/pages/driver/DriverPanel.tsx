import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTitle } from "../../hooks/useTitle";
import {
  Package,
  MapPin,
  User,
  Phone,
  CheckCircle,
  DollarSign,
  Wallet,
  TrendingUp,
  LogOut,
  Gift,
  Loader2,
  AlertTriangle,
  MessageCircle,
  History,
  XCircle,
  Wifi,
  WifiOff,
  Clock,
  ShoppingBag,
  Navigation,
  Store,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useData, type OrderStatus } from "../../contexts/DataContext";
import { calculateOrderFinance, calculateDriverBonus, formatCurrency } from "../../utils/financeCalculations";
import { Logo } from "../../components/Logo";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { OrderItemsDetail } from "../../components/OrderItemsDetail";
import { toast } from "sonner";

const MIN_BALANCE = 30000;

const normalizePhoneForWhatsApp = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.startsWith('0')) return '62' + digitsOnly.slice(1);
  if (digitsOnly.startsWith('62')) return digitsOnly;
  return digitsOnly;
};

export function DriverPanel() {
  useTitle("Panel Driver");

  const { role, isAuthenticated, logout, driverId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    orders, drivers, updateOrderStatus, feeSettings, outlets,
    driverRejectOrder, toggleDriverOnline, completeOrderWithDeduction, updateDriverBalance,
    updateDriverLocation
  } = useData();
  
  // Multi-order support: get all active orders for this driver
  const myActiveOrders = useMemo(() => {
    return orders.filter(o => 
      o.driver_id === driverId && 
      ["processing", "going-to-store", "picked-up", "on-delivery"].includes(o.status)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, driverId]);

  const [actionLoading, setActionLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'history'>('orders');
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [showOrderItemsDetail, setShowOrderItemsDetail] = useState<{ orderId: string; outletName: string } | null>(null);

  const currentDriver = drivers.find((d) => d.id === driverId);
  const driverBalance = (currentDriver as any)?.balance ?? 0;
  const isOnline = (currentDriver as any)?.is_online ?? false;

  // GPS Tracking (Fitur #55)
  useEffect(() => {
    let watchId: number | null = null;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 25000; // 25 seconds

    if (isOnline && driverId && navigator.geolocation) {
      console.log("Starting GPS Tracking for driver:", driverId);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastUpdate > UPDATE_INTERVAL) {
            updateDriverLocation(driverId, pos.coords.latitude, pos.coords.longitude);
            lastUpdate = now;
          }
        },
        (err) => console.error("GPS Tracking Error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log("Stopped GPS Tracking");
      }
    };
  }, [isOnline, driverId, updateDriverLocation]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || role !== "driver" || !driverId) {
      navigate("/login-driver");
    }
  }, [isAuthenticated, role, driverId, navigate, authLoading]);

  if (authLoading || !isAuthenticated || role !== "driver" || !driverId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const myOrders = orders.filter(
    (o) => o.driver_id === driverId && o.status === "driver_assigned"
  );
  const completedOrders = orders.filter((o) => o.driver_id === driverId && o.status === "completed");
  const today = new Date().toDateString();
  const todaysCompleted = completedOrders.filter((o) => new Date(o.created_at).toDateString() === today);

  const getFinance = (order: any) => calculateOrderFinance(order.subtotal, order.distance, order.service_fee || 0, {
    cost_per_km: feeSettings.cost_per_km ?? 2000,
    service_fee: 0,
    admin_fee: 0,
    driver_share_pct: feeSettings.driver_share_pct ?? 80,
    admin_share_pct: feeSettings.admin_share_pct ?? 20,
    min_distance_km: feeSettings.min_distance_km ?? 1,
  });

  const todayStats = {
    orders: todaysCompleted.length,
    earning: todaysCompleted.reduce((sum, o) => sum + getFinance(o).driverEarning, 0),
    distance: todaysCompleted.reduce((sum, o) => sum + o.distance, 0),
  };

  const bonus = calculateDriverBonus(todayStats.orders);

  // ── Handlers ──────────────────────────────────────────────────
  const handleAccept = async (order: any) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(order.id, "processing", driverId);
      toast.success("Pesanan diterima!");
    } catch {
      toast.error("Gagal mengupdate status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus): Promise<void> => {
    setActionLoading(true);
    try {
      if (nextStatus === "completed") {
        await completeOrderWithDeduction(orderId, driverId!);
        toast.success("Pengiriman selesai! Setoran otomatis dipotong.");
        
        // Auto Bonus Logic Check
        const updatedStats = todayStats.orders + 1;
        const prevBonus = calculateDriverBonus(todayStats.orders).totalBonus;
        const newBonus = calculateDriverBonus(updatedStats).totalBonus;
        if (newBonus > prevBonus) {
          const bonusAmount = newBonus - prevBonus;
          try {
            await updateDriverBalance(driverId!, bonusAmount);
            toast.success(`🎉 Selamat! Milestone ${updatedStats} tercapai: Bonus Rp${bonusAmount.toLocaleString()}`);
          } catch (err) {
            console.error("Gagal top up bonus", err);
          }
        }
      } else {
        await updateOrderStatus(orderId, nextStatus, driverId);
        toast.success(`Status diperbarui ke ${nextStatus}`);
      }
    } catch (err) {
      toast.error("Gagal mengupdate status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!driverId || onlineLoading) return;
    setOnlineLoading(true);
    try {
      const newStatus = await toggleDriverOnline(driverId);
      toast.success(newStatus ? "Status: Online ✅" : "Status: Offline 🔴");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status");
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleRejectOrder = async (order: any) => {
    if (!driverId || actionLoading) return;
    setActionLoading(true);
    try {
      await driverRejectOrder(order.id, driverId);
      toast.success("Order ditolak. Saldo dipotong Rp500 sebagai penalti.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak order");
    } finally {
      setActionLoading(false);
    }
  };

  // ── JSX ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Logo size="2xl" showText={false} />
              <p className="text-sm text-gray-600 mt-1">Halo, {currentDriver?.name || "Driver"}!</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleOnline}
                disabled={onlineLoading}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isOnline ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {onlineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </button>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ───── No Active Order View ───── */}
        {myActiveOrders.length === 0 ? (
          <div>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Order Hari Ini</div>
                  <Package className="w-5 h-5 text-[#FF6A00]" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{todayStats.orders}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Total Earning</div>
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(todayStats.earning)}</div>
              </div>
              <div className={`rounded-xl shadow-sm p-5 ${driverBalance < MIN_BALANCE ? "bg-red-50 border-2 border-red-300" : "bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Saldo Deposit</div>
                  <Wallet className={`w-5 h-5 ${driverBalance < MIN_BALANCE ? "text-red-500" : "text-blue-500"}`} />
                </div>
                <div className={`text-2xl font-bold ${driverBalance < MIN_BALANCE ? "text-red-600" : "text-blue-600"}`}>
                  {formatCurrency(driverBalance)}
                </div>
                {driverBalance < MIN_BALANCE && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Saldo di bawah minimum ({formatCurrency(MIN_BALANCE)})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Low Balance Warning */}
            {driverBalance < MIN_BALANCE && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-red-800">Saldo Tidak Mencukupi</div>
                  <div className="text-sm text-red-600">
                    Saldo deposit Anda di bawah minimum {formatCurrency(MIN_BALANCE)}. Hubungi admin untuk top up.
                  </div>
                </div>
              </div>
            )}

            {/* Bonus System */}
            <div className="bg-gradient-to-r from-[#FF6A00] to-[#FF8534] rounded-2xl shadow-lg p-6 mb-8 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-6 h-6" />
                <h3 className="text-lg font-bold">Sistem Bonus Hari Ini</h3>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-sm opacity-90 mb-2">Bonus Aktif</div>
                <div className="text-2xl font-bold mb-3">{formatCurrency(bonus.totalBonus)}</div>
                <div className="space-y-2 text-xs opacity-90">
                  {[
                    { threshold: 10, reward: 5000 },
                    { threshold: 15, reward: 7000 },
                    { threshold: 20, reward: 10000 },
                    { threshold: 30, reward: 15000 },
                  ].map(({ threshold, reward }) => (
                    <div key={threshold} className="flex justify-between items-center">
                      <span className={todayStats.orders >= threshold ? 'line-through opacity-60' : ''}>
                        {threshold} orders → {formatCurrency(reward)}
                      </span>
                      {todayStats.orders >= threshold && <span className="text-green-300 font-bold">✓</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs">
                  Progress: <strong>{todayStats.orders}</strong> order selesai hari ini
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex mb-6 bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'orders' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package className="w-4 h-4" />
                Order Tersedia
                {myOrders.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'orders' ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'
                  }`}>{myOrders.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'history' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <History className="w-4 h-4" />
                Histori Lengkap
                {completedOrders.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === 'history' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>{completedOrders.length}</span>
                )}
              </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                {myOrders.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada order tersedia</p>
                    <p className="text-sm text-gray-400 mt-2">Tunggu admin untuk assign order ke Anda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map((order) => {
                      const finance = getFinance(order);
                      return (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-2 text-lg">
                                Order #{order.id.slice(0, 8)}
                              </div>
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-start gap-2">
                                  <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <div>
                                      <div>{order.customer_name}</div>
                                      <div className="text-xs">{order.customer_phone}</div>
                                      {order.customer_note && (
                                        <div className="mt-1 text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100">
                                          Catatan: {order.customer_note}
                                        </div>
                                      )}
                                    </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm text-gray-600 mb-1">Jarak</div>
                              <div className="text-xl font-bold text-orange-600">{order.distance} km</div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900 mb-1">Ambil di:</div>
                                <div className="text-gray-600">{order.outlet_name}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="font-medium text-gray-900">Antar ke:</div>
                                  {order.customer_latitude && order.customer_longitude && (
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&origin=${
                                        outlets.find(o => o.id === order.outlet_id)?.latitude || ""
                                      },${
                                        outlets.find(o => o.id === order.outlet_id)?.longitude || ""
                                      }&destination=${order.customer_latitude},${order.customer_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 font-semibold"
                                    >
                                      Buka Peta
                                    </a>
                                  )}
                                </div>
                                <div className="text-gray-600">{order.address}, {order.customer_village}</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Wallet className="w-4 h-4" />
                              Detail Keuangan
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                                <span className="text-gray-600">Metode Bayar:</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  order.payment_method === "cod" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                                }`}>
                                  {order.payment_method === "cod" ? "COD (Tagih)" : "Sudah Dibayar"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Customer bayar:</span>
                                <span className="font-semibold text-gray-900">{formatCurrency(finance.total)}</span>
                              </div>
                              <div className="border-t border-blue-200 pt-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Bayar ke toko:</span>
                                  <span className="text-gray-900">{formatCurrency(finance.amountToStore)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Earning kamu:</span>
                                  <span className="font-semibold text-green-600">{formatCurrency(finance.driverEarning)}</span>
                                </div>
                                <div className="flex justify-between items-start text-xs">
                                  <div className="flex flex-col">
                                    <span className="text-gray-600">Setor ke admin:</span>
                                    <span className="text-[10px] text-gray-500 leading-tight">
                                      (20% ongkir: {formatCurrency(finance.setoranToAdmin - (order.service_fee || 0))} + markup: {formatCurrency(order.service_fee || 0)})
                                    </span>
                                  </div>
                                  <span className="font-semibold text-orange-600">{formatCurrency(finance.setoranToAdmin)}</span>
                                </div>
                              </div>
                              {order.payment_method === "cod" && (
                                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                  <p className="text-xs text-yellow-800 font-medium">
                                    Tagih uang ke customer: {formatCurrency(finance.total)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {(() => {
                              const outlet = outlets.find(o => o.id === order.outlet_id);
                              return (
                                <>
                                  <a
                                    href={`https://www.google.com/maps?q=${outlet?.latitude},${outlet?.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold shadow-sm"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    Maps Kedai
                                  </a>
                                  {order.customer_latitude && (
                                    <a
                                      href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-bold shadow-sm"
                                    >
                                      <Navigation className="w-3.5 h-3.5" />
                                      Maps Customer
                                    </a>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <button
                            onClick={() => setShowOrderItemsDetail({ orderId: order.id, outletName: order.outlet_name })}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium mb-3"
                          >
                            <ShoppingBag className="w-5 h-5" />
                            <span>Lihat Pesanan</span>
                          </button>

                          <button
                            onClick={() => {
                              const phone = normalizePhoneForWhatsApp(order.customer_phone);
                              if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                              else toast.error("Nomor telepon customer tidak tersedia");
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium mb-3"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>WhatsApp Customer</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(order)}
                              disabled={driverBalance < MIN_BALANCE || actionLoading}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                                driverBalance < MIN_BALANCE ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'
                              }`}
                            >
                              {driverBalance < MIN_BALANCE ? (
                                <><AlertTriangle className="w-5 h-5" /><span>Saldo Kurang</span></>
                              ) : actionLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /><span>Memproses...</span></>
                              ) : (
                                <><CheckCircle className="w-5 h-5" /><span>Terima</span></>
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmAction({
                                title: "Tolak Pesanan",
                                description: "Yakin ingin menolak pesanan ini? Saldo Anda akan dipotong Rp500 sebagai penalti.",
                                onConfirm: () => handleRejectOrder(order),
                              })}
                              disabled={actionLoading}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
                            >
                              <XCircle className="w-5 h-5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Histori Lengkap ({completedOrders.length})
                </h2>
                {completedOrders.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Belum ada histori pengiriman</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedOrders.map((order) => {
                      const finance = getFinance(order);
                      const isToday = new Date(order.created_at).toDateString() === today;
                      return (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-gray-900 text-sm">{order.outlet_name}</span>
                                {isToday && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Hari ini</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                #{order.id.slice(0, 8)} • {order.customer_village} • {order.distance} km
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(order.created_at).toLocaleDateString('id-ID', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-green-600 font-semibold text-sm">
                                +{formatCurrency(finance.driverEarning)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Total: {formatCurrency(finance.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        ) : (
          /* ───── Multi-Order Routing View ───── */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-orange-100">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 animate-pulse" />
                  <h2 className="text-lg font-bold">Rute Pengantaran Aktif</h2>
                </div>
                <div className="text-xs bg-white/20 px-2 py-1 rounded-full font-bold">
                  {myActiveOrders.length} Pesanan
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-8 relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100" />

                  {/* Combined Tasks Generation */}
                  {(() => {
                    // Logic: Pickups first, then Deliveries
                    const pickups = myActiveOrders.filter(o => o.status === "processing" || o.status === "going-to-store");
                    const readyToPick = myActiveOrders.filter(o => o.status === "going-to-store");
                    const deliverable = myActiveOrders.filter(o => o.status === "picked-up" || o.status === "on-delivery");
                    
                    const tasks: any[] = [];
                    
                    // Group pickups by outlet to avoid redundancy
                    const uniqueOutlets = Array.from(new Set(myActiveOrders.map(o => o.outlet_id)));
                    uniqueOutlets.forEach(oid => {
                      const outletOrders = myActiveOrders.filter(o => o.outlet_id === oid && ["processing", "going-to-store"].includes(o.status));
                      if (outletOrders.length > 0) {
                        const outlet = outlets.find(o => o.id === oid);
                        tasks.push({
                          type: 'pickup',
                          outlet: outlet,
                          orders: outletOrders,
                          status: outletOrders.every(o => o.status === "going-to-store") ? 'ready' : 'pending'
                        });
                      }
                    });

                    // Add deliveries
                    myActiveOrders.filter(o => ["picked-up", "on-delivery"].includes(o.status)).forEach(order => {
                      tasks.push({
                        type: 'delivery',
                        order: order,
                        status: order.status === "on-delivery" ? 'ready' : 'pending'
                      });
                    });

                    return tasks.map((task, idx) => {
                      const isLast = idx === tasks.length - 1;
                      if (task.type === 'pickup') {
                        return (
                          <div key={`pickup-${task.outlet?.id}`} className="relative pl-10">
                            <div className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                              task.status === 'ready' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <Store className="w-5 h-5" />
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-bold text-gray-900">{task.outlet?.name}</h3>
                                  <p className="text-xs text-gray-500">{task.outlet?.village}</p>
                                </div>
                                <a 
                                  href={`https://www.google.com/maps?q=${task.outlet?.latitude},${task.outlet?.longitude}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="p-2 bg-white rounded-lg shadow-sm text-blue-600"
                                >
                                  <Navigation className="w-4 h-4" />
                                </a>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {task.orders.map((o: any) => (
                                  <span key={o.id} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-full font-medium">
                                    #{o.id.slice(0, 8)}
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                {task.orders[0].status === "processing" ? (
                                  <button
                                    onClick={() => handleUpdateStatus(task.orders[0].id, "going-to-store")}
                                    disabled={actionLoading}
                                    className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold shadow-sm"
                                  >
                                    Menuju Toko
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setShowOrderItemsDetail({ orderId: task.orders[0].id, outletName: task.outlet?.name })}
                                    className="flex-1 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-sm font-bold"
                                  >
                                    Ambil Pesanan
                                  </button>
                                )}
                                {task.orders.length > 1 && task.orders.every(o => o.status === "going-to-store") && (
                                  <button
                                    onClick={async () => {
                                      setActionLoading(true);
                                      try {
                                        for (const o of task.orders) {
                                          await updateOrderStatus(o.id, "picked-up", driverId);
                                        }
                                        toast.success("Semua pesanan di kedai ini diambil!");
                                      } catch { toast.error("Gagal update"); }
                                      finally { setActionLoading(false); }
                                    }}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold"
                                  >
                                    Ambil Semua
                                  </button>
                                )}
                                {task.orders.length === 1 && task.orders[0].status === "going-to-store" && (
                                  <button
                                    onClick={() => handleUpdateStatus(task.orders[0].id, "picked-up")}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold"
                                  >
                                    Sudah Ambil
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const order = task.order;
                        return (
                          <div key={`delivery-${order.id}`} className="relative pl-10">
                            <div className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                              task.status === 'ready' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-bold text-gray-900">{order.customer_name}</h3>
                                  <p className="text-xs text-gray-600 font-medium">{order.customer_village}</p>
                                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 italic">"{order.address}"</p>
                                </div>
                                <div className="flex gap-2">
                                  <a 
                                    href={`https://wa.me/${normalizePhoneForWhatsApp(order.customer_phone)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="p-2 bg-white rounded-lg shadow-sm text-green-600"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                  <a 
                                    href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="p-2 bg-white rounded-lg shadow-sm text-blue-600"
                                  >
                                    <Navigation className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                              <div className="flex justify-between items-center mb-3 text-xs">
                                <span className="font-bold text-blue-700">Total: {formatCurrency(getFinance(order).total)}</span>
                                <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-black ${
                                  order.payment_method === "cod" ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                                }`}>
                                  {order.payment_method === "cod" ? "Tagih COD" : "Lunas (Transfer)"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {order.status === "picked-up" ? (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, "on-delivery")}
                                    disabled={actionLoading}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm"
                                  >
                                    Mulai Kirim
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmAction({
                                      title: "Selesaikan Order",
                                      description: `Konfirmasi pengantaran selesai ke ${order.customer_name}?`,
                                      onConfirm: () => handleUpdateStatus(order.id, "completed")
                                    })}
                                    disabled={actionLoading}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md shadow-green-100"
                                  >
                                    Selesai
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setActiveTab('orders')}
              className="w-full py-4 bg-white text-gray-600 font-bold rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              Lihat Order Masuk Lainnya
            </button>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Konfirmasi Logout"
        description="Apakah Anda yakin ingin logout?"
        confirmText="Ya, Logout"
        cancelText="Batal"
        onConfirm={async () => { await logout(); navigate("/login-driver"); }}
      />

      {confirmAction && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => !open && !actionLoading && setConfirmAction(null)}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmText={actionLoading ? "Memproses..." : "Konfirmasi"}
          cancelText="Batal"
          onConfirm={confirmAction.onConfirm}
        />
      )}

      {/* Order Items Detail Modal */}
      {showOrderItemsDetail && (
        <OrderItemsDetail
          orderId={showOrderItemsDetail.orderId}
          outletName={showOrderItemsDetail.outletName}
          mode="modal"
          onClose={() => setShowOrderItemsDetail(null)}
        />
      )}
    </div>
  );
}
