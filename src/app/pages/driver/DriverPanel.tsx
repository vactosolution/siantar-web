import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Phone,
  CheckCircle,
  X,
  DollarSign,
  Wallet,
  TrendingUp,
  LogOut,
  Gift,
  Trophy,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { calculateOrderFinance, calculateDriverBonus, formatCurrency } from "../../utils/financeCalculations";
import { Logo } from "../../components/Logo";

export function DriverPanel() {
  const { role, isAuthenticated, logout, driverId, sessionId } = useAuth();
  const navigate = useNavigate();
  const { orders, updateOrderStatus, drivers, getDriverByUsername } = useData();
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // Redirect if not authenticated as driver
  useEffect(() => {
    if (!isAuthenticated || role !== "driver" || !driverId) {
      navigate("/login-driver");
      return;
    }

    // Check if session is still valid (detect login from another device)
    const driver = drivers.find(d => d.id === driverId);
    if (driver && driver.currentSessionId !== sessionId) {
      // Session invalidated - logout
      alert("Akun Anda telah login dari perangkat lain. Silakan login kembali.");
      logout();
      navigate("/login-driver");
    }
  }, [isAuthenticated, role, driverId, sessionId, drivers, navigate, logout]);

  if (!isAuthenticated || role !== "driver" || !driverId) {
    return null;
  }

  // Get orders assigned ONLY to this specific driver
  const myOrders = orders.filter(
    (o) => o.driverId === driverId && o.status !== "pending" && o.status !== "completed"
  );
  const completedOrders = orders.filter((o) => o.driverId === driverId && o.status === "completed");

  const handleAccept = (order: any) => {
    setActiveOrder(order);
  };

  const handleGoingToStore = () => {
    if (activeOrder) {
      updateOrderStatus(activeOrder.id, "going-to-store");
    }
  };

  const handlePickup = () => {
    if (activeOrder) {
      updateOrderStatus(activeOrder.id, "picked-up");
    }
  };

  const handleDeliver = () => {
    if (activeOrder) {
      updateOrderStatus(activeOrder.id, "on-delivery");
    }
  };

  const handleComplete = () => {
    if (activeOrder) {
      updateOrderStatus(activeOrder.id, "completed");
      setActiveOrder(null);
    }
  };

  // Mock stats - in real app, calculate from actual orders
  const todayStats = {
    orders: completedOrders.length,
    earning: completedOrders.reduce((sum, o) => {
      const finance = calculateOrderFinance(o.subtotal, o.distance);
      return sum + finance.driverEarning;
    }, 0),
    distance: completedOrders.reduce((sum, o) => sum + o.distance, 0),
  };

  const weeklyOrders = completedOrders.length; // Mock
  const bonus = calculateDriverBonus(todayStats.orders, weeklyOrders);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Logo />
              <p className="text-sm text-gray-600 mt-1">Driver Panel</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/home"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <button
                onClick={logout}
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
        {!activeOrder ? (
          <div>
            {/* Driver Stats */}
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
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(todayStats.earning)}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    <div className="w-2 h-2 bg-green-700 rounded-full animate-pulse" />
                    <span className="font-medium">Online</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {todayStats.distance} km hari ini
                </div>
              </div>
            </div>

            {/* Bonus Section */}
            <div className="bg-gradient-to-r from-[#FF6A00] to-[#FF8534] rounded-2xl shadow-lg p-6 mb-8 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-6 h-6" />
                <h3 className="text-lg font-bold">Sistem Bonus</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-sm opacity-90 mb-2">Bonus Hari Ini</div>
                  <div className="text-2xl font-bold mb-3">{formatCurrency(bonus.dailyBonus)}</div>
                  <div className="space-y-1 text-xs opacity-90">
                    <div className="flex justify-between">
                      <span>5 orders</span>
                      <span className={todayStats.orders >= 5 ? "font-bold" : ""}>Rp 5.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10 orders</span>
                      <span className={todayStats.orders >= 10 ? "font-bold" : ""}>Rp 15.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>15 orders</span>
                      <span className={todayStats.orders >= 15 ? "font-bold" : ""}>Rp 30.000</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-sm opacity-90 mb-2">Bonus Mingguan</div>
                  <div className="text-2xl font-bold mb-3">{formatCurrency(bonus.weeklyBonus)}</div>
                  <div className="space-y-1 text-xs opacity-90">
                    <div className="flex justify-between">
                      <span>50 orders</span>
                      <span className={weeklyOrders >= 50 ? "font-bold" : ""}>Rp 50.000</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <span>Progress: {weeklyOrders}/50 orders</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Orders */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Tersedia
              </h2>
              {myOrders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Tidak ada order tersedia</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Tunggu admin untuk assign order ke Anda
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => {
                    const finance = calculateOrderFinance(order.subtotal, order.distance);

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl shadow-sm p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-2 text-lg">
                              Order #{order.id}
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-start gap-2">
                                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div>{order.customerName}</div>
                                  <div className="text-xs">{order.customerPhone || "No phone"}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{order.items.map(i => `${i.name} x${i.quantity}`).join(", ")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-gray-600 mb-1">Jarak</div>
                            <div className="text-xl font-bold text-orange-600">
                              {order.distance} km
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900 mb-1">
                                Ambil di:
                              </div>
                              <div className="text-gray-600">
                                {order.outlet.name} - {order.outlet.village}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900 mb-1">
                                Antar ke:
                              </div>
                              <div className="text-gray-600">
                                {order.address}, {order.customerVillage}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Finance Breakdown */}
                        <div className="bg-blue-50 rounded-lg p-4 mb-4">
                          <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Detail Keuangan
                          </div>
                          <div className="space-y-2 text-sm">
                            {/* Payment Method Info */}
                            <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                              <span className="text-gray-600">Metode Bayar:</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                order.paymentMethod === "cod" 
                                  ? "bg-yellow-100 text-yellow-800" 
                                  : "bg-green-100 text-green-800"
                              }`}>
                                {order.paymentMethod === "cod" ? "💵 COD (Tagih)" : "✓ Sudah Dibayar"}
                              </span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Customer bayar:</span>
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(finance.total)}
                              </span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Bayar ke toko:</span>
                                <span className="text-gray-900">
                                  {formatCurrency(finance.amountToStore)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Earning kamu:</span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(finance.driverEarning)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Setor ke admin:</span>
                                <span className="font-semibold text-orange-600">
                                  {formatCurrency(finance.setoranToAdmin)}
                                </span>
                              </div>
                            </div>
                            
                            {/* COD Collection Notice */}
                            {order.paymentMethod === "cod" && (
                              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs text-yellow-800 font-medium">
                                  ⚠️ Tagih uang ke customer: {formatCurrency(finance.total)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAccept(order)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span>Mulai Pengiriman</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Active Order */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Order Aktif
                </h2>
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
                  <div className="font-semibold text-gray-900 mb-2">
                    Order #{activeOrder.id}
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{activeOrder.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{activeOrder.customerPhone || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>{activeOrder.items.map((i: any) => `${i.name} x${i.quantity}`).join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900 mb-1">
                        Lokasi Ambil:
                      </div>
                      <div className="text-gray-600">
                        {activeOrder.outlet.name} - {activeOrder.outlet.village}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900 mb-1">
                        Alamat Pengiriman:
                      </div>
                      <div className="text-gray-600">
                        {activeOrder.address}, {activeOrder.customerVillage}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Finance Breakdown for Active Order */}
                {(() => {
                  const finance = calculateOrderFinance(activeOrder.subtotal, activeOrder.distance);
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
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(finance.total)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Bayar Toko</div>
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(finance.amountToStore)}
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Earning Kamu</div>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(finance.driverEarning)}
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Setor Admin</div>
                            <div className="font-semibold text-orange-600">
                              {formatCurrency(finance.setoranToAdmin)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 bg-white/50 rounded p-2">
                          💡 Jarak: {activeOrder.distance} km • Earning: 80% dari delivery fee
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {activeOrder.status === "processing" && (
                  <button
                    onClick={handleGoingToStore}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                  >
                    Menuju Toko
                  </button>
                )}
                {activeOrder.status === "going-to-store" && (
                  <button
                    onClick={handlePickup}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                  >
                    Ambil Pesanan
                  </button>
                )}
                {activeOrder.status === "picked-up" && (
                  <button
                    onClick={handleDeliver}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                  >
                    Mulai Pengiriman
                  </button>
                )}
                {activeOrder.status === "on-delivery" && (
                  <button
                    onClick={handleComplete}
                    className="w-full py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                  >
                    Selesaikan Pengiriman
                  </button>
                )}
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
    </div>
  );
}