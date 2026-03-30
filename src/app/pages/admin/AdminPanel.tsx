import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Store,
  User,
  Phone,
  MapPin,
  FileText,
  Truck,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Calendar,
  Activity,
  ChevronRight,
  Eye,
  Navigation,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  FileSpreadsheet,
  LayoutDashboard,
  Edit2,
  ArrowLeft,
} from "lucide-react";
import { useData, Order, Outlet as OutletType, Village } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, calculateOrderFinance } from "../../utils/financeCalculations";
import { ProductManagement } from "../../components/ProductManagement";
import { FinanceDashboard } from "../../components/FinanceDashboard";
import { InvoiceModal } from "../../components/InvoiceModal";
import { Logo } from "../../components/Logo";
import { DriverManagement } from "../../components/DriverManagement";
import { ManualOrderCreation } from "../../components/ManualOrderCreation";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { NotificationPanel } from "../../components/NotificationPanel";
import { useNotification } from "../../contexts/NotificationContext";

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

export function AdminPanel() {
  const { role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { 
    orders, 
    drivers, 
    outlets, 
    addOutlet, 
    updateOutlet: updateOutletData, 
    deleteOutlet, 
    assignDriver, 
    updateOrder, 
    getProductsByOutlet,
    addDriver,
    updateDriver,
    deactivateDriver,
    resetDriverCredentials
  } = useData();
  const { showSuccess, showError, showInfo } = useNotification();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "drivers" | "stores" | "finance"
  >("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Confirmation dialogs state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDriverAssignConfirm, setShowDriverAssignConfirm] = useState(false);
  const [showPaymentApprovalConfirm, setShowPaymentApprovalConfirm] = useState(false);
  const [showOutletSaveConfirm, setShowOutletSaveConfirm] = useState(false);
  const [pendingDriverAssignment, setPendingDriverAssignment] = useState<{orderId: string, driverId: string, driverName: string} | null>(null);
  const [pendingPaymentApproval, setPendingPaymentApproval] = useState<{orderId: string, action: 'approve' | 'reject'} | null>(null);

  // Outlet management state
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<OutletType | null>(null);
  const [outletForm, setOutletForm] = useState({
    name: "",
    village: "" as Village | "",
    category: "food" as "food" | "drink" | "package",
    menuCount: 10,
    image: "", // Optional image URL
  });

  // Driver assignment state
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  // Invoice state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<"customer" | "outlet">("customer");
  const [showInvoiceTypeSelector, setShowInvoiceTypeSelector] = useState<string | null>(null);

  // Manual Order state
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);

  // Redirect if not authenticated as admin
  useEffect(() => {
    if (!isAuthenticated || role !== "admin") {
      navigate("/login-admin");
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || role !== "admin") {
    return null;
  }

  // Calculate finance data
  const totalOrdersToday = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalDeliveryFees = orders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const totalAdminProfit = orders.reduce((sum, order) => {
    const finance = calculateOrderFinance(order.subtotal, order.distance);
    return sum + finance.adminProfit;
  }, 0);
  const activeDrivers = drivers.filter(d => d.status === "online").length;

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    "going-to-store": "bg-purple-100 text-purple-700",
    "picked-up": "bg-indigo-100 text-indigo-700",
    "on-delivery": "bg-orange-100 text-orange-700",
    completed: "bg-green-100 text-green-700",
  };

  const statusLabels = {
    pending: "Menunggu",
    processing: "Diproses",
    "going-to-store": "Ke Toko",
    "picked-up": "Diambil",
    "on-delivery": "Diantar",
    completed: "Selesai",
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "finance", label: "Finance", icon: DollarSign },
    { id: "drivers", label: "Drivers", icon: Users },
    { id: "stores", label: "Outlets", icon: Store },
  ];

  const handleAddOutlet = () => {
    setEditingOutlet(null);
    setOutletForm({
      name: "",
      village: "",
      category: "food",
      menuCount: 10,
      image: "",
    });
    setShowOutletModal(true);
  };

  const handleEditOutlet = (outlet: OutletType) => {
    setEditingOutlet(outlet);
    setOutletForm({
      name: outlet.name,
      village: outlet.village,
      category: outlet.category,
      menuCount: outlet.menuCount,
      image: outlet.image || "",
    });
    setShowOutletModal(true);
  };

  const handleSaveOutlet = () => {
    if (!outletForm.name || !outletForm.village) {
      alert("Mohon lengkapi semua data");
      return;
    }

    if (editingOutlet) {
      updateOutletData(editingOutlet.id, outletForm);
    } else {
      addOutlet(outletForm as Omit<OutletType, "id">);
    }
    setShowOutletModal(false);
    setShowOutletSaveConfirm(true);
  };

  const handleDeleteOutlet = (id: string) => {
    if (confirm("Yakin ingin menghapus outlet ini?")) {
      deleteOutlet(id);
    }
  };

  const handleAssignDriver = (orderId: string, driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    try {
      assignDriver(orderId, driverId, driver.name);
      setAssigningOrderId(null);
      alert(`Order berhasil di-assign ke ${driver.name}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleOpenInvoiceModal = (order: Order) => {
    setSelectedInvoiceOrder(order);
    setShowInvoiceTypeSelector(order.id);
  };

  const handleSelectInvoiceType = (type: "customer" | "outlet") => {
    setSelectedInvoiceType(type);
    setShowInvoiceTypeSelector(null);
    setShowInvoiceModal(true);
  };

  const handleApprovePayment = (orderId: string) => {
    if (!confirm("Konfirmasi pembayaran ini?")) return;
    
    updateOrder(orderId, {
      paymentStatus: "confirmed",
      status: "pending", // Move to pending so admin can assign driver
    });
    
    alert("Pembayaran telah dikonfirmasi. Order siap untuk di-assign ke driver.");
  };

  const handleRejectPayment = (orderId: string) => {
    const reason = prompt("Alasan penolakan pembayaran:");
    if (!reason) return;
    
    updateOrder(orderId, {
      paymentStatus: "rejected",
      paymentProofUrl: undefined, // Clear the proof so customer can re-upload
    });
    
    alert(`Pembayaran ditolak. Alasan: ${reason}\nCustomer harus upload ulang bukti pembayaran.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <Logo />
          <p className="text-sm text-gray-600 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-orange-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 space-y-2">
          <Link
            to="/home"
            className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Home</span>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white">
            <div className="p-6 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="px-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-orange-500 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 capitalize">
                {activeTab}
              </h1>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {activeTab === "dashboard" && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">Total Orders</div>
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{totalOrdersToday}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">Revenue Total</div>
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">Admin Profit</div>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalAdminProfit)}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">Driver Online</div>
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{activeDrivers}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Terbaru
                </h2>
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          Order #{order.id}
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.customerName} • {order.outlet.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                        <div
                          className={`inline-block px-3 py-1 rounded-full text-xs ${
                            statusColors[order.status]
                          }`}
                        >
                          {statusLabels[order.status]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              {/* Manual Order Creation Button */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Daftar Order</h2>
                <button
                  onClick={() => setShowManualOrderModal(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#FF6A00] to-orange-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Buat Pesanan Manual</span>
                </button>
              </div>

              {orders.map((order) => {
                const finance = calculateOrderFinance(order.subtotal, order.distance);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl shadow-sm p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-semibold text-gray-900 text-lg">
                            Order #{order.id}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              statusColors[order.status]
                            }`}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{order.customerName}</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Outlet:</span> {order.outlet.name} ({order.outlet.village})
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Items:</span>{" "}
                            {order.items.map(i => `${i.name} x${i.quantity}`).join(", ")}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{order.customerVillage}</span>
                          </div>
                          {/* Admin-only distance details */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                            <div className="text-gray-700">
                              <span className="font-medium">Jarak Aktual:</span> {order.distance} km
                            </div>
                            <div className="text-gray-700">
                              <span className="font-medium">Jarak Dikenakan:</span> {order.chargedDistance || Math.max(order.distance, 1)} km
                            </div>
                            {(order.isMinimumChargeApplied || order.distance < 1) && (
                              <div className="text-orange-600 text-xs mt-1 font-medium">
                                ⚠️ Minimum charge 1 km diterapkan
                              </div>
                            )}
                            <div className="text-gray-600 text-xs mt-1">
                              Formula: {Math.max(order.distance, 1)} km × Rp 2.000 = {formatCurrency(order.deliveryFee)}
                            </div>
                          </div>
                          {order.driverName && (
                            <div className="text-gray-600">
                              <span className="font-medium">Driver:</span> {order.driverName}
                            </div>
                          )}
                          {/* Payment Information */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                            <div className="text-sm font-medium text-purple-900 mb-2">
                              💳 Informasi Pembayaran
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="text-gray-700">
                                <span className="font-medium">Metode:</span>{" "}
                                {order.paymentMethod === "cod" ? "Cash on Delivery" : `Transfer ${order.paymentProvider || ""}`}
                              </div>
                              {order.paymentMethod === "transfer" && (
                                <>
                                  {order.uniquePaymentCode && (
                                    <div className="text-gray-700">
                                      <span className="font-medium">Kode Unik:</span> {order.uniquePaymentCode}
                                    </div>
                                  )}
                                  {order.finalPaymentAmount && (
                                    <div className="text-gray-700">
                                      <span className="font-medium">Jumlah Transfer:</span> {formatCurrency(order.finalPaymentAmount)}
                                    </div>
                                  )}
                                  <div className="text-gray-700">
                                    <span className="font-medium">Status Bayar:</span>{" "}
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      order.paymentStatus === "confirmed" ? "bg-green-100 text-green-700" :
                                      order.paymentStatus === "waiting_confirmation" ? "bg-yellow-100 text-yellow-700" :
                                      order.paymentStatus === "rejected" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {order.paymentStatus === "confirmed" ? "Terkonfirmasi" :
                                       order.paymentStatus === "waiting_confirmation" ? "Menunggu Konfirmasi" :
                                       order.paymentStatus === "rejected" ? "Ditolak" :
                                       "Menunggu Pembayaran"}
                                    </span>
                                  </div>
                                  {order.paymentProofUrl && (
                                    <div className="mt-2">
                                      <div className="text-gray-700 font-medium mb-1">Bukti Transfer:</div>
                                      <img
                                        src={order.paymentProofUrl}
                                        alt="Payment Proof"
                                        className="w-full h-32 object-contain bg-white rounded border cursor-pointer"
                                        onClick={() => window.open(order.paymentProofUrl, "_blank")}
                                      />
                                    </div>
                                  )}
                                  {order.paymentStatus === "waiting_confirmation" && (
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => handleApprovePayment(order.id)}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                      >
                                        ✓ Terima
                                      </button>
                                      <button
                                        onClick={() => handleRejectPayment(order.id)}
                                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                      >
                                        ✗ Tolak
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="lg:text-right">
                        <div className="bg-orange-50 rounded-lg p-4 space-y-2 text-sm">
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-bold text-orange-600">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-600">Admin Profit:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(finance.adminProfit)}
                            </span>
                          </div>
                        </div>
                        {order.status === "pending" && (
                          <div className="mt-3">
                            {assigningOrderId === order.id ? (
                              <div className="bg-white border-2 border-orange-500 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-900 mb-2">
                                  Pilih Driver:
                                </div>
                                <div className="space-y-2">
                                  {drivers.filter(d => d.status === "online").map(driver => (
                                    <button
                                      key={driver.id}
                                      onClick={() => handleAssignDriver(order.id, driver.id)}
                                      className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded text-sm transition-colors"
                                    >
                                      {driver.name}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setAssigningOrderId(null)}
                                    className="w-full px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAssigningOrderId(order.id)}
                                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                              >
                                Assign Driver
                              </button>
                            )}
                          </div>
                        )}
                        <div className="mt-3">
                          {showInvoiceTypeSelector === order.id ? (
                            <div className="bg-white border-2 border-orange-500 rounded-lg p-3">
                              <div className="text-sm font-medium text-gray-900 mb-2">
                                Pilih Tipe Invoice:
                              </div>
                              <div className="space-y-2">
                                <button
                                  onClick={() => handleSelectInvoiceType("customer")}
                                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded text-sm transition-colors"
                                >
                                  Invoice Pelanggan
                                </button>
                                <button
                                  onClick={() => handleSelectInvoiceType("outlet")}
                                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded text-sm transition-colors"
                                >
                                  Invoice Outlet
                                </button>
                                <button
                                  onClick={() => setShowInvoiceTypeSelector(null)}
                                  className="w-full px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenInvoiceModal(order)}
                              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                            >
                              Buat Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada order</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "finance" && (
            <FinanceDashboard />
          )}

          {activeTab === "drivers" && (
            <DriverManagement
              drivers={drivers}
              orders={orders}
              onAddDriver={addDriver}
              onUpdateDriver={updateDriver}
              onDeactivateDriver={deactivateDriver}
              onResetCredentials={resetDriverCredentials}
            />
          )}

          {activeTab === "stores" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Manajemen Outlet</h2>
                <button
                  onClick={handleAddOutlet}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Tambah Outlet</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {outlets.map((outlet) => {
                  const menuCount = getProductsByOutlet(outlet.id).length;
                  return (
                    <div
                      key={outlet.id}
                      onClick={() => navigate(`/admin/outlet/${outlet.id}/menu`)}
                      className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Store className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {outlet.name}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {outlet.village}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditOutlet(outlet)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOutlet(outlet.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kategori:</span>
                          <span className="font-medium text-gray-900 capitalize">{outlet.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Menu:</span>
                          <span className="font-medium text-gray-900">{menuCount} item</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>Klik untuk kelola menu →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <ProductManagement />
          )}
        </main>
      </div>

      {/* Outlet Modal */}
      {showOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowOutletModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingOutlet ? "Edit Outlet" : "Tambah Outlet"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Outlet
                </label>
                <input
                  type="text"
                  value={outletForm.name}
                  onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
                  placeholder="Contoh: Warung Makan Bu Siti"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desa <span className="text-red-500">*</span>
                </label>
                <select
                  value={outletForm.village}
                  onChange={(e) => setOutletForm({ ...outletForm, village: e.target.value as Village })}
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
                  Kategori
                </label>
                <select
                  value={outletForm.category}
                  onChange={(e) => setOutletForm({ ...outletForm, category: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="food">Makanan</option>
                  <option value="drink">Minuman</option>
                  <option value="package">Paket/Barang</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Menu
                </label>
                <input
                  type="number"
                  value={outletForm.menuCount}
                  onChange={(e) => setOutletForm({ ...outletForm, menuCount: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Outlet (Opsional)
                </label>
                <input
                  type="text"
                  value={outletForm.image}
                  onChange={(e) => setOutletForm({ ...outletForm, image: e.target.value })}
                  placeholder="URL gambar outlet"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOutletModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveOutlet}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          order={selectedInvoiceOrder!}
          type={selectedInvoiceType}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Manual Order Creation Modal */}
      {showManualOrderModal && (
        <ManualOrderCreation
          onClose={() => setShowManualOrderModal(false)}
          onOrderCreated={(orderId) => {
            setShowManualOrderModal(false);
            toast.success(`Pesanan manual berhasil dibuat! Order ID: ${orderId}`);
          }}
        />
      )}

      {/* Confirmation Dialogs */}
      {showLogoutConfirm && (
        <ConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          title="Konfirmasi Logout"
          description="Apakah Anda yakin ingin logout dari Admin Panel?"
          confirmText="Ya, Logout"
          cancelText="Batal"
          onConfirm={() => {
            logout();
            navigate("/login-admin");
          }}
          variant="default"
        />
      )}

      {/* Outlet Save Success Notification */}
      <ConfirmDialog
        open={showOutletSaveConfirm}
        onOpenChange={setShowOutletSaveConfirm}
        title="Perubahan berhasil disimpan"
        description="Data outlet telah berhasil diperbarui."
        confirmText="OK"
        cancelText="Tutup"
        onConfirm={() => setShowOutletSaveConfirm(false)}
        variant="default"
      />
    </div>
  );
}