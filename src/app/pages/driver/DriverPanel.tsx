import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
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
  const { role, isAuthenticated, logout, driverId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    orders, drivers, updateOrderStatus, feeSettings,
    driverRejectOrder, toggleDriverOnline, completeOrderWithDeduction, updateDriverBalance
  } = useData();
  const [activeOrder, setActiveOrder] = useState<any>(null);
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

  // Sync activeOrder with realtime updates or auto-assign if none selected
  useEffect(() => {
    if (activeOrder) {
      const updated = orders.find(o => o.id === activeOrder.id);
      if (updated && updated.status !== activeOrder.status) {
        setActiveOrder(updated);
      }
    } else if (driverId && orders.length > 0) {
      // Auto-assign the most recent active order that this driver is already working on
      const activeMyOrders = orders.filter(
        (o) => o.driver_id === driverId && 
        o.status !== "pending" && 
        o.status !== "driver_assigned" && 
        o.status !== "completed"
      );
      if (activeMyOrders.length > 0) {
        const latestActive = activeMyOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        setActiveOrder(latestActive);
      }
    }
  }, [orders, activeOrder, driverId]);

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
    (o) => o.driver_id === driverId && o.status !== "pending" && o.status !== "completed"
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
  }, order.delivery_fee);

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
      setActiveOrder({ ...order, status: "processing" });
      toast.success("Pesanan diterima!");
    } catch {
      toast.error("Gagal mengupdate status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoingToStore = async (): Promise<void> => {
    if (!activeOrder) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(activeOrder.id, "going-to-store", driverId);
      setActiveOrder({ ...activeOrder, status: "going-to-store" });
      toast.success("Status: Menuju Toko");
    } catch (err) {
      toast.error("Gagal mengupdate status");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async (): Promise<void> => {
    if (!activeOrder) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(activeOrder.id, "picked-up", driverId);
      setActiveOrder({ ...activeOrder, status: "picked-up" });
      toast.success("Pesanan berhasil diambil");
    } catch {
      toast.error("Gagal mengupdate status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (): Promise<void> => {
    if (!activeOrder) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(activeOrder.id, "on-delivery", driverId);
      setActiveOrder({ ...activeOrder, status: "on-delivery" });
      toast.success("Mulai pengiriman");
    } catch {
      toast.error("Gagal mengupdate status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (): Promise<void> => {
    if (!activeOrder) return;
    setActionLoading(true);
    try {
      await completeOrderWithDeduction(activeOrder.id, driverId!);
      toast.success("Pengiriman selesai! Setoran otomatis dipotong.");
      
      // Auto Bonus Logic Check
      const updatedStats = todayStats.orders + 1; // Since we just completed one
      const prevBonus = calculateDriverBonus(todayStats.orders).totalBonus;
      const newBonus = calculateDriverBonus(updatedStats).totalBonus;
      if (newBonus > prevBonus) {
        const bonusAmount = newBonus - prevBonus;
        try {
          await updateDriverBalance(driverId!, bonusAmount);
          toast.success(`🎉 Selamat! Anda mencapai milestone ${updatedStats} pesanan dan mendapat bonus tambahan Rp${bonusAmount.toLocaleString("id-ID")}`);
        } catch (err) {
          console.error("Gagal top up bonus", err);
        }
      }

      setActiveOrder(null);
    } catch {
      try {
        await updateOrderStatus(activeOrder.id, "completed", driverId);
        toast.success("Pengiriman selesai!");
        setActiveOrder(null);
      } catch {
        toast.error("Gagal menyelesaikan order");
      }
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
      if (activeOrder?.id === order.id) setActiveOrder(null);
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
              <Logo />
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
        {!activeOrder ? (
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
                                    <div className="text-xs">{order.customer_phone || "No phone"}</div>
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
                              <div>
                                <div className="font-medium text-gray-900 mb-1">Antar ke:</div>
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
          /* ───── Active Order View ───── */
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Order Aktif</h2>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span className="font-medium">
                    {activeOrder.status === "processing" && "Diproses"}
                    {activeOrder.status === "going-to-store" && "Menuju Toko"}
                    {activeOrder.status === "picked-up" && "Pesanan Diambil"}
                    {activeOrder.status === "on-delivery" && "Dalam Perjalanan"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="font-semibold text-gray-900 mb-2">Order #{activeOrder.id.slice(0, 8)}</div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{activeOrder.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{activeOrder.customer_phone || "No phone"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900 mb-1">Lokasi Ambil:</div>
                      <div className="text-gray-600">{activeOrder.outlet_name}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900 mb-1">Alamat Pengiriman:</div>
                      <div className="text-gray-600">{activeOrder.address}, {activeOrder.customer_village}</div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const finance = getFinance(activeOrder);
                  return (
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-5">
                      <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Ringkasan Keuangan
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Customer Bayar</div>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(finance.total)}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Bayar Toko</div>
                            <div className="font-semibold text-gray-900">{formatCurrency(finance.amountToStore)}</div>
                          </div>
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Earning Kamu</div>
                            <div className="font-semibold text-green-600">{formatCurrency(finance.driverEarning)}</div>
                          </div>
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Setor Admin</div>
                            <div className="font-semibold text-orange-600">{formatCurrency(finance.setoranToAdmin)}</div>
                            <div className="text-[8px] text-gray-400 leading-tight mt-1">
                              20% Ongkir: {formatCurrency(finance.setoranToAdmin - (activeOrder.service_fee || 0))}<br/>
                              Markup: {formatCurrency(activeOrder.service_fee || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Lihat Pesanan Button in Active Order */}
                <button
                  onClick={() => setShowOrderItemsDetail({ orderId: activeOrder.id, outletName: activeOrder.outlet_name })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Lihat Detail Pesanan</span>
                </button>
              </div>

              {/* Progress Steps */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {[
                    { key: "processing", label: "Diproses", icon: "📋" },
                    { key: "going-to-store", label: "Menuju Toko", icon: "🏪" },
                    { key: "picked-up", label: "Pickup", icon: "📦" },
                    { key: "on-delivery", label: "OTW", icon: "🚗" },
                    { key: "completed", label: "Selesai", icon: "✅" },
                  ].map((step, idx) => {
                    const steps = ["processing", "going-to-store", "picked-up", "on-delivery", "completed"];
                    const currentIdx = steps.indexOf(activeOrder.status);
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                          isCompleted ? "bg-green-500" : isCurrent ? "bg-orange-500 ring-4 ring-orange-100" : "bg-gray-200"
                        }`}>
                          {isCompleted ? "✓" : step.icon}
                        </div>
                        <div className={`text-xs mt-1 text-center font-medium ${
                          isCompleted ? "text-green-600" : isCurrent ? "text-orange-600" : "text-gray-400"
                        }`}>
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="relative h-1 bg-gray-200 rounded-full mt-2">
                  {(() => {
                    const steps = ["processing", "going-to-store", "picked-up", "on-delivery", "completed"];
                    const currentIdx = steps.indexOf(activeOrder.status);
                    const pct = currentIdx >= 0 ? (currentIdx / (steps.length - 1)) * 100 : 0;
                    return <div className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {activeOrder.status === "processing" && (
                  <button
                    onClick={() => setConfirmAction({
                      title: "Menuju Toko",
                      description: "Konfirmasi bahwa Anda akan menuju ke toko pengambilan?",
                      onConfirm: handleGoingToStore,
                    })}
                    disabled={actionLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    Menuju Toko
                  </button>
                )}
                {activeOrder.status === "going-to-store" && (
                  <button
                    onClick={() => setConfirmAction({
                      title: "Ambil Pesanan",
                      description: "Konfirmasi bahwa Anda akan mengambil pesanan dari toko?",
                      onConfirm: handlePickup,
                    })}
                    disabled={actionLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    Ambil Pesanan
                  </button>
                )}
                {activeOrder.status === "picked-up" && (
                  <button
                    onClick={() => setConfirmAction({
                      title: "Mulai Pengiriman",
                      description: "Konfirmasi bahwa Anda akan memulai pengiriman ke customer?",
                      onConfirm: handleDeliver,
                    })}
                    disabled={actionLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    Mulai Pengiriman
                  </button>
                )}
                {activeOrder.status === "on-delivery" && (
                  <button
                    onClick={() => setConfirmAction({
                      title: "Selesaikan Pengiriman",
                      description: "Konfirmasi bahwa Anda telah menyelesaikan pengiriman? Setoran otomatis akan dipotong dari saldo.",
                      onConfirm: handleComplete,
                    })}
                    disabled={actionLoading}
                    className="w-full py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    Selesaikan Pengiriman
                  </button>
                )}

                {(() => {
                  const phone = normalizePhoneForWhatsApp(activeOrder.customer_phone);
                  return phone ? (
                    <a
                      href={`https://wa.me/${phone}?text=${encodeURIComponent(
                        `Halo ${activeOrder.customer_name}, saya driver Anda.\n\nPesanan: #${activeOrder.id.slice(0, 8)}\nTujuan: ${activeOrder.customer_village}\n\nTerima kasih!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp Customer
                    </a>
                  ) : null;
                })()}
              </div>
            </div>

            <button
              onClick={() => setActiveOrder(null)}
              className="w-full py-3 text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              Kembali ke Daftar Order
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
