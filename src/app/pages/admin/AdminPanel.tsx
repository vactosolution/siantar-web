import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import {
  Package,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Store,
  User,
  MapPin,
  Truck,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Settings,
  Upload,
  Image as ImageIcon,
  Loader2,
  Bell,
  Wallet,
  Image,
  Copy,
  DoorOpen,
  DoorClosed,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useData, Order, Outlet, Profile } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, calculateOrderFinance, getDefaultFeeSettings, calculateDistance } from "../../utils/financeCalculations";
import { FinanceDashboard } from "../../components/FinanceDashboard";
import { InvoiceModal } from "../../components/InvoiceModal";
import { Logo } from "../../components/Logo";
import { DriverManagement } from "../../components/DriverManagement";
import { ManualOrderCreation } from "../../components/ManualOrderCreation";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useNotification } from "../../contexts/NotificationContext";
import { uploadFile } from "../../../lib/supabase";
import { BannerManagement } from "../../components/BannerManagement";
import { NotificationManagement } from "../../components/NotificationManagement";
import { DriverFinanceManagement } from "../../components/DriverFinanceManagement";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { OrderItemsDetail } from "../../components/OrderItemsDetail";

const VILLAGE_GROUPS = [
  {
    label: "Wilayah 1 (Dekat)",
    villages: [
      "Desa Bukit Sungkai",
      "Desa Sekuningan Baru",
      "Desa Balai Riam (Pusat Kecamatan)",
      "Desa Bangun Jaya",
    ],
  },
  {
    label: "Wilayah 2 (Jauh)",
    villages: [
      "Desa Lupu Peruca",
      "Desa Natai Kondang",
      "Desa Ajang",
    ],
  },
];

export function AdminPanel() {
  const { role, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const {
    orders,
    drivers,
    outlets,
    addOutlet,
    updateOutlet: updateOutletData,
    deleteOutlet,
    restoreOutlet,
    toggleOutletOpen,
    assignDriver,
    updateOrder,
    rejectOrder,
    deleteOrder,
    getProductsByOutlet,
    addDriver,
    updateDriver,
    deactivateDriver,
    loadingOutlets,
    loadingOrders,
    loadingDrivers,
    appSettings,
    updateAppSetting,
  } = useData();

  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "drivers" | "stores" | "finance" | "informasi" | "keuangan-driver" | "pengaturan">("dashboard");
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "all" | "custom">("today");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== "all" && order.status !== statusFilter) return false;

      // 2. Date Filter
      const orderDate = new Date(order.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        return orderDate >= today;
      } else if (dateFilter === "yesterday") {
        const tomorrow = new Date(yesterday);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return orderDate >= yesterday && orderDate < tomorrow;
      } else if (dateFilter === "custom") {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
        return true;
      }

      return true; // "all"
    });
  }, [orders, dateFilter, statusFilter, customStartDate, customEndDate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteOutletConfirm, setShowDeleteOutletConfirm] = useState<string | null>(null);
  const [showAssignDriverConfirm, setShowAssignDriverConfirm] = useState<{ orderId: string; driverId: string } | null>(null);
  const [showRejectOrderConfirm, setShowRejectOrderConfirm] = useState<string | null>(null);
  const [showDeleteOrderConfirm, setShowDeleteOrderConfirm] = useState<string | null>(null);
  const [showRejectPaymentModal, setShowRejectPaymentModal] = useState<string | null>(null);
  const [rejectPaymentReason, setRejectPaymentReason] = useState("");
  const [showOrderItemsDetail, setShowOrderItemsDetail] = useState<{ orderId: string; outletName: string } | null>(null);

  // Outlet management
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [outletForm, setOutletForm] = useState({
    name: "",
    village: "",
    category: "Bakso & Mie Ayam" as string,
    image_url: "" as string | null,
    latitude: "" as string | number,
    longitude: "" as string | number,
  });
  const [outletImageFile, setOutletImageFile] = useState<File | null>(null);
  const [outletImagePreview, setOutletImagePreview] = useState<string | null>(null);
  const [savingOutlet, setSavingOutlet] = useState(false);

  // Driver assignment
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  // Invoice
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<"customer" | "outlet">("customer");
  const [showInvoiceTypeSelector, setShowInvoiceTypeSelector] = useState<string | null>(null);

  // Manual Order
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || role !== "admin") {
      navigate("/login-admin");
    }
  }, [isAuthenticated, role, navigate, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || role !== "admin") return null;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const fees = getDefaultFeeSettings();
  const totalAdminProfit = orders.reduce((sum, o) => {
    const adminSharePct = fees.admin_share_pct / 100;
    const adminFromDelivery = (o.delivery_fee || 0) * adminSharePct;
    return sum + adminFromDelivery + (o.service_fee || 0) + (o.admin_fee || 0);
  }, 0);
  const activeDrivers = drivers.filter((d) => d.is_active).length;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    "going-to-store": "bg-purple-100 text-purple-700",
    "picked-up": "bg-indigo-100 text-indigo-700",
    "on-delivery": "bg-orange-100 text-orange-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    pending: "Menunggu Validasi",
    driver_assigned: "Driver Ditugaskan",
    processing: "Diproses",
    "going-to-store": "Ke Toko",
    "picked-up": "Diambil",
    "on-delivery": "Diantar",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };

  const formatWhatsAppUrl = (phone: string, orderId: string, customerName: string) => {
    let cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("8")) {
      cleanPhone = "62" + cleanPhone;
    }
    
    const message = encodeURIComponent(
      `Halo ${customerName}, kami dari Admin SiAntar. Ingin konfirmasi pesanan Anda #${orderId.slice(0, 8)}. Apakah benar Anda melakukan pemesanan ini?`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const navigationItems = [
    { id: "dashboard", label: "Dasbor", icon: TrendingUp },
    { id: "orders", label: "Pesanan", icon: ShoppingBag },
    { id: "finance", label: "Keuangan", icon: DollarSign },
    { id: "drivers", label: "Driver", icon: Users },
    { id: "stores", label: "Outlet", icon: Store },
    { id: "informasi", label: "Informasi", icon: Bell },
    { id: "keuangan-driver", label: "Keuangan Driver", icon: Wallet },
    { id: "pengaturan", label: "Pengaturan", icon: Settings },
  ];

  const handleAddOutlet = () => {
    setEditingOutlet(null);
    setOutletForm({ name: "", village: "", category: "Bakso & Mie Ayam", image_url: null, latitude: "", longitude: "" });
    setOutletImageFile(null);
    setOutletImagePreview(null);
    setShowOutletModal(true);
  };

  const handleEditOutlet = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setOutletForm({
      name: outlet.name,
      village: outlet.village,
      category: outlet.category,
      image_url: outlet.image_url,
      latitude: outlet.latitude || "",
      longitude: outlet.longitude || "",
    });
    setOutletImageFile(null);
    setOutletImagePreview(outlet.image_url);
    setShowOutletModal(true);
  };

  const handleOutletImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOutletImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setOutletImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOutlet = async () => {
    if (!outletForm.name || !outletForm.village) {
      toast.error("Mohon lengkapi nama dan desa");
      return;
    }
    setSavingOutlet(true);
    try {
      let imageUrl = outletForm.image_url;
      if (outletImageFile) {
        const path = `outlet-${Date.now()}-${outletImageFile.name}`;
        imageUrl = await uploadFile("outlet-images", path, outletImageFile);
      }
      const data = { 
        ...outletForm, 
        image_url: imageUrl,
        latitude: outletForm.latitude !== "" ? Number(outletForm.latitude) : null,
        longitude: outletForm.longitude !== "" ? Number(outletForm.longitude) : null,
      };
      if (editingOutlet) {
        await updateOutletData(editingOutlet.id, data);
        toast.success("Outlet berhasil diupdate");
      } else {
        await addOutlet(data);
        toast.success("Outlet berhasil ditambahkan");
      }
      setShowOutletModal(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan outlet");
    }
    setSavingOutlet(false);
  };

  const handleDeleteOutlet = async (id: string) => {
    try {
      await deleteOutlet(id);
      toast.success("Outlet berhasil dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus outlet");
    } finally {
      setShowDeleteOutletConfirm(null);
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    try {
      await assignDriver(orderId, driverId, driver.name);
      await updateOrder(orderId, { status: "driver_assigned" });
      setAssigningOrderId(null);
      toast.success(`Order di-assign ke ${driver.name}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal assign driver");
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

  const handleApprovePayment = async (orderId: string) => {
    try {
      await updateOrder(orderId, { payment_status: "confirmed", status: "pending" });
      toast.success("Pembayaran dikonfirmasi");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    if (!rejectPaymentReason.trim()) {
      toast.error("Mohon isi alasan penolakan");
      return;
    }
    try {
      await updateOrder(orderId, {
        payment_status: "rejected",
        payment_proof_url: null,
        payment_rejection_reason: rejectPaymentReason.trim(),
      } as any);
      toast.success("Pembayaran ditolak");
      setShowRejectPaymentModal(null);
      setRejectPaymentReason("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await rejectOrder(orderId);
      toast.success("Pesanan ditolak");
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak pesanan");
    } finally {
      setShowRejectOrderConfirm(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      toast.success("Pesanan dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pesanan");
    } finally {
      setShowDeleteOrderConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <Logo showText={false} size="2xl" />
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
                  activeTab === item.id ? "bg-orange-500 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <Link
            to="/admin/settings"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Sidebar Mobile */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col">
            <div className="p-6 flex items-center justify-between">
              <Logo showText={false} size="2xl" />
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === item.id ? "bg-orange-500 text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <Link
                to="/admin/settings"
                onClick={() => setIsSidebarOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => { setShowLogoutConfirm(true); setIsSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 capitalize">{activeTab}</h1>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">Total Pesanan</div>
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{totalOrders}</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-600">Pendapatan</div>
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
                    <div className="text-sm text-gray-600">Driver Aktif</div>
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{activeDrivers}</div>
                </div>
              </div>

              {/* Live Tracking Drivers (Fitur #55) */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-orange-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Live Tracking Driver (Online)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drivers.filter(d => (d as any).is_online).length === 0 ? (
                    <div className="col-span-full py-6 text-center text-gray-400 text-sm italic">
                      Tidak ada driver online saat ini.
                    </div>
                  ) : (
                    drivers.filter(d => (d as any).is_online).map(driver => (
                      <div key={driver.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-gray-900">{driver.name}</div>
                            <div className="text-[10px] text-gray-500">Update: { (driver as any).last_location_update ? new Date((driver as any).last_location_update).toLocaleTimeString() : 'N/A' }</div>
                          </div>
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <div className="text-xs text-gray-600 mb-3 space-y-1">
                          <div className="flex justify-between">
                            <span>Saldo:</span>
                            <span className="font-medium">{formatCurrency((driver as any).balance || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Posisi:</span>
                            <span className="font-mono text-[10px]">
                              {(driver as any).latitude?.toFixed(4)}, {(driver as any).longitude?.toFixed(4)}
                            </span>
                          </div>
                        </div>
                        {(driver as any).latitude && (
                          <a
                            href={`https://www.google.com/maps?q=${(driver as any).latitude},${(driver as any).longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            📍 Lihat di Maps
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Terbaru</h2>
                {loadingOrders ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">#{order.id}</div>
                          <div className="text-sm text-gray-600">{order.customer_name} • {order.outlet_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatCurrency(order.total)}</div>
                          <div className={`inline-block px-3 py-1 rounded-full text-xs ${statusColors[order.status]}`}>
                            {statusLabels[order.status]}
                          </div>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-gray-500 text-center py-4">Belum ada order</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Daftar Order</h2>
                  <p className="text-sm text-gray-600 mt-1">Kelola pesanan yang masuk dan sedang berjalan</p>
                </div>
                <button
                  onClick={() => setShowManualOrderModal(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#FF6A00] to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Buat Pesanan Manual</span>
                </button>
              </div>

              {/* Filter Section */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Filter Tanggal</label>
                    <div className="relative">
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                      >
                        <option value="today">Hari Ini</option>
                        <option value="yesterday">Kemarin</option>
                        <option value="all">Semua Tanggal</option>
                        <option value="custom">Pilih Tanggal</option>
                      </select>
                      <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Custom Date Inputs */}
                  {dateFilter === "custom" && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Mulai</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sampai</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status Pesanan</label>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                      >
                        <option value="all">Semua Status</option>
                        <option value="pending">Menunggu Validasi</option>
                        <option value="processing">Diproses</option>
                        <option value="driver_assigned">Driver Ditugaskan</option>
                        <option value="going-to-store">Menuju Toko</option>
                        <option value="picked-up">Diambil</option>
                        <option value="on-delivery">Dikirim</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                      </select>
                      <Truck className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div className="flex items-end pb-1">
                    <div className="text-xs text-gray-500 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100 w-full text-center">
                      Ditemukan <span className="font-bold text-orange-600">{filteredOrders.length}</span> pesanan
                    </div>
                  </div>
                </div>
              </div>

              {loadingOrders ? (
                <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada order</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const finance = calculateOrderFinance(order.subtotal, order.distance, order.service_fee || 0, {
                      cost_per_km: fees.cost_per_km,
                      service_fee: 0,
                      admin_fee: 0,
                      driver_share_pct: fees.driver_share_pct,
                      admin_share_pct: fees.admin_share_pct,
                      min_distance_km: fees.min_distance_km,
                    }, order.delivery_fee);
                  return (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-semibold text-gray-900 text-lg">Order #{order.id}</span>
                            <span className={`px-3 py-1 rounded-full text-sm ${statusColors[order.status]}`}>
                              {statusLabels[order.status]}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{order.customer_name}</span>
                            </div>
                            <div className="text-gray-600">
                              <span className="font-medium">Outlet:</span> {order.outlet_name}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{order.customer_village}</span>
                              {order.customer_latitude && order.customer_longitude && (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&origin=${
                                    outlets.find(o => o.id === order.outlet_id)?.latitude || ""
                                  },${
                                    outlets.find(o => o.id === order.outlet_id)?.longitude || ""
                                  }&destination=${order.customer_latitude},${order.customer_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-auto text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full hover:bg-orange-200 font-semibold"
                                >
                                  Peta
                                </a>
                              )}
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                              <div className="text-gray-700"><span className="font-medium">Jarak:</span> {order.distance} km → Dikenakan: {order.charged_distance} km</div>
                              <div className="text-gray-600 text-xs mt-1">Ongkir: {formatCurrency(order.delivery_fee)}</div>
                            </div>
                            {order.driver_name && (
                              <div className="text-gray-600"><span className="font-medium">Driver:</span> {order.driver_name}</div>
                            )}
                            {/* Payment Info */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                              <div className="text-sm font-medium text-purple-900 mb-2">Pembayaran</div>
                              <div className="space-y-1 text-sm">
                                <div className="text-gray-700">
                                  <span className="font-medium">Metode:</span>{" "}
                                  {order.payment_method === "cod" ? "COD" : `Transfer ${order.payment_provider || ""}`}
                                </div>
                                {order.unique_payment_code && (
                                  <div className="text-gray-700"><span className="font-medium">Kode Unik:</span> {order.unique_payment_code}</div>
                                )}
                                {order.final_payment_amount && (
                                  <div className="text-gray-700"><span className="font-medium">Jumlah Transfer:</span> {formatCurrency(order.final_payment_amount)}</div>
                                )}
                                <div className="text-gray-700">
                                  <span className="font-medium">Status:</span>{" "}
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    order.payment_status === "confirmed" ? "bg-green-100 text-green-700" :
                                    order.payment_status === "waiting_confirmation" ? "bg-yellow-100 text-yellow-700" :
                                    order.payment_status === "rejected" ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-700"
                                  }`}>
                                    {order.payment_status === "confirmed" ? "Terkonfirmasi" :
                                     order.payment_status === "waiting_confirmation" ? "Menunggu Konfirmasi" :
                                     order.payment_status === "rejected" ? "Ditolak" : "Menunggu"}
                                  </span>
                                </div>
                                {order.payment_proof_url && (
                                  <div className="mt-2">
                                    <div className="text-gray-700 font-medium mb-1">Bukti Transfer:</div>
                                    <img
                                      src={order.payment_proof_url}
                                      alt="Bukti Bayar"
                                      className="w-full h-32 object-contain bg-white rounded border cursor-pointer"
                                      onClick={() => window.open(order.payment_proof_url!, "_blank")}
                                    />
                                  </div>
                                )}
                                {order.payment_status === "waiting_confirmation" && (
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={() => handleApprovePayment(order.id)} className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                                      Terima
                                    </button>
                                    <button onClick={() => setShowRejectPaymentModal(order.id)} className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                                      Tolak
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="lg:text-right">
                          {/* Lihat Pesanan Button */}
                          <button
                            onClick={() => setShowOrderItemsDetail({ orderId: order.id, outletName: order.outlet_name })}
                            className="w-full mb-3 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            Lihat Pesanan
                          </button>
                          <div className="bg-orange-50 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex justify-between gap-6">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-gray-600">Markup (layanan):</span>
                              <span className="font-medium">{formatCurrency(order.service_fee)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-gray-600">Ongkir ({order.charged_distance} km):</span>
                              <span className="font-medium">{formatCurrency(order.delivery_fee)}</span>
                            </div>
                            <div className="flex justify-between gap-6 border-t pt-2">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-bold text-orange-600">{formatCurrency(order.total)}</span>
                            </div>
                            <div className="border-t pt-2 space-y-1">
                              <div className="flex justify-between gap-6 text-[10px] text-gray-500 italic">
                                <span>- Potongan ongkir (20%):</span>
                                <span>{formatCurrency(finance.setoranToAdmin - (order.service_fee || 0))}</span>
                              </div>
                              <div className="flex justify-between gap-6 text-[10px] text-gray-500 italic">
                                <span>- Tambahan markup menu:</span>
                                <span>{formatCurrency(order.service_fee || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-gray-600 font-medium">↗ Total Setoran admin:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(finance.setoranToAdmin)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-gray-600">↙ Earning driver:</span>
                                <span className="font-semibold text-blue-600">{formatCurrency(finance.driverEarning)}</span>
                              </div>
                            </div>
                          </div>
                          {order.status === "pending" && (
                            <div className="mt-3 space-y-2">
                              {/* WhatsApp Validation Button */}
                              <a
                                href={formatWhatsAppUrl(order.customer_phone, order.id, order.customer_name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                              >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A14.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                Hubungi Customer (WA)
                              </a>

                              {assigningOrderId === order.id ? (
                                <div className="bg-white border-2 border-orange-500 rounded-lg p-3">
                                  <div className="text-sm font-medium text-gray-900 mb-2">Pilih Driver Terdekat:</div>
                                  <div className="space-y-2">
                                    {(() => {
                                      const orderOutlet = outlets.find(o => o.id === order.outlet_id);
                                      const driverList = drivers
                                        .filter((d) => d.is_active)
                                        .map(driver => {
                                          const isOnline = (driver as any).is_online;
                                          let distToOutlet = Infinity;
                                          if (isOnline && orderOutlet?.latitude && orderOutlet?.longitude && (driver as any).latitude && (driver as any).longitude) {
                                            distToOutlet = calculateDistance(
                                              Number((driver as any).latitude),
                                              Number((driver as any).longitude),
                                              Number(orderOutlet.latitude),
                                              Number(orderOutlet.longitude)
                                            );
                                          }
                                          return { ...driver, distToOutlet, isOnline };
                                        })
                                        .sort((a, b) => {
                                          if (a.isOnline && !b.isOnline) return -1;
                                          if (!a.isOnline && b.isOnline) return 1;
                                          return a.distToOutlet - b.distToOutlet;
                                        });

                                      return driverList.map((driver, idx) => {
                                        const todayDriverOrders = orders.filter(
                                          o => o.driver_id === driver.id &&
                                          new Date(o.created_at).toDateString() === new Date().toDateString() &&
                                          o.status === 'completed'
                                        ).length;
                                        const canAssign = driver.isOnline;

                                        return (
                                          <div key={driver.id} className="space-y-1">
                                            <button
                                              onClick={() => canAssign && handleAssignDriver(order.id, driver.id)}
                                              disabled={!canAssign}
                                              className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                                                canAssign
                                                  ? (idx === 0 ? 'bg-orange-50 border border-orange-200 hover:bg-orange-100' : 'bg-gray-50 hover:bg-orange-50')
                                                  : 'bg-gray-100 cursor-not-allowed opacity-60'
                                              }`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${driver.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                  <span className="font-medium">
                                                    {driver.name}
                                                    {idx === 0 && driver.isOnline && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase">Terdekat</span>}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex gap-1 items-center">
                                                  {driver.distToOutlet !== Infinity && (
                                                    <span className="font-bold text-orange-600 bg-orange-50 px-1.5 rounded">{driver.distToOutlet.toFixed(1)} KM ke Kedai</span>
                                                  )}
                                                  <span>•</span>
                                                  <span>{todayDriverOrders}x hari ini</span>
                                                </div>
                                              </div>
                                              {!canAssign && (
                                                <div className="text-[10px] text-red-500 mt-1">
                                                  ⚠ Driver offline — tidak bisa di-assign
                                                </div>
                                              )}
                                            </button>
                                            {driver.isOnline && (driver as any).latitude && (
                                              <div className="flex gap-2 pl-4">
                                                <a
                                                  href={`https://www.google.com/maps?q=${(driver as any).latitude},${(driver as any).longitude}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[9px] text-blue-600 hover:underline flex items-center gap-0.5"
                                                >
                                                  <MapPin className="w-2.5 h-2.5" /> Lihat Posisi Driver
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      });
                                    })()}
                                    <button onClick={() => setAssigningOrderId(null)} className="w-full px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-bold border-t mt-2">
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAssigningOrderId(order.id)}
                                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                                >
                                  Assign Driver
                                </button>
                              )}
                            </div>
                          )}
                          {order.status === "driver_assigned" && (
                            <div className="mt-3">
                              <div className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm text-center font-medium cursor-not-allowed">
                                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                Driver Ditugaskan
                              </div>
                            </div>
                          )}
                          <div className="mt-3">
                            {showInvoiceTypeSelector === order.id ? (
                              <div className="bg-white border-2 border-orange-500 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-900 mb-2">Pilih Tipe Invoice:</div>
                                <div className="space-y-2">
                                  <button onClick={() => handleSelectInvoiceType("customer")} className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded text-sm">
                                    Invoice Pelanggan
                                  </button>
                                  <button onClick={() => handleSelectInvoiceType("outlet")} className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded text-sm">
                                    Invoice Outlet
                                  </button>
                                  <button onClick={() => setShowInvoiceTypeSelector(null)} className="w-full px-3 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">
                                    Batal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => handleOpenInvoiceModal(order)} className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                                Buat Invoice
                              </button>
                            )}
                          </div>
                          {order.status === "pending" && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setShowRejectOrderConfirm(order.id)}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                              >
                                Tolak Pesanan
                              </button>
                              <button
                                onClick={() => setShowDeleteOrderConfirm(order.id)}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                              >
                                Hapus Pesanan
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "finance" && <FinanceDashboard />}
          {activeTab === "drivers" && <DriverManagement />}
          {activeTab === "informasi" && (
            <Tabs defaultValue="banners">
              <TabsList>
                <TabsTrigger value="banners">Banner</TabsTrigger>
                <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
              </TabsList>
              <TabsContent value="banners"><BannerManagement /></TabsContent>
              <TabsContent value="notifications"><NotificationManagement /></TabsContent>
            </Tabs>
          )}
          {activeTab === "keuangan-driver" && <DriverFinanceManagement />}
          {activeTab === "pengaturan" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-orange-500" />
                  Pengaturan Operasional
                </h2>

                {/* Global Service Toggle */}
                <div className="space-y-6 pb-8 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Status Layanan (Global)</h3>
                      <p className="text-sm text-gray-600">Buka atau tutup seluruh layanan SiAnter</p>
                    </div>
                    <button
                      onClick={() => updateAppSetting("is_service_open", !appSettings.is_service_open)}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                        appSettings.is_service_open ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          appSettings.is_service_open ? "translate-x-8" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {!appSettings.is_service_open && (
                    <div className="space-y-4 bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pesan Layanan Tutup</label>
                        <textarea
                          value={appSettings.service_closed_message || ""}
                          onChange={(e) => updateAppSetting("service_closed_message", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          rows={3}
                          placeholder="Pesan yang tampil saat layanan tutup..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Jam Operasional (Teks)</label>
                        <input
                          type="text"
                          value={appSettings.service_hours || ""}
                          onChange={(e) => updateAppSetting("service_hours", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          placeholder="Contoh: Buka kembali pukul 10.00 – 20.00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Village Availability Toggle */}
                <div className="pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Ketersediaan Lokasi Pengantaran
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VILLAGE_GROUPS.map((group) => (
                      <div key={group.label} className="space-y-3">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.label}</div>
                        <div className="space-y-2">
                          {group.villages.map((village) => {
                            const isInactive = (appSettings.inactive_villages || []).includes(village);
                            return (
                              <div key={village} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className={`text-sm font-medium ${isInactive ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                  {village}
                                </span>
                                <button
                                  onClick={() => {
                                    const current = appSettings.inactive_villages || [];
                                    const next = isInactive
                                      ? current.filter((v: string) => v !== village)
                                      : [...current, village];
                                    updateAppSetting("inactive_villages", next);
                                  }}
                                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                    !isInactive ? "bg-blue-500" : "bg-gray-300"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      !isInactive ? "translate-x-5.5" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "stores" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Manajemen Outlet</h2>
                <button onClick={handleAddOutlet} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  <Plus className="w-5 h-5" />
                  <span>Tambah Outlet</span>
                </button>
              </div>
              {loadingOutlets ? (
                <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {outlets.map((outlet) => {
                    const menuCount = getProductsByOutlet(outlet.id).length;
                    const isActive = outlet.is_active !== false;
                    return (
                      <div key={outlet.id} onClick={() => isActive && navigate(`/admin/outlet/${outlet.id}/menu`)} className={`bg-white rounded-xl shadow-sm p-6 transition-shadow ${isActive ? 'cursor-pointer hover:shadow-md' : 'opacity-75'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {outlet.image_url ? (
                              <img src={outlet.image_url} alt={outlet.name} className={`w-12 h-12 rounded-lg object-cover ${!isActive ? 'grayscale' : ''}`} />
                            ) : (
                              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Store className="w-6 h-6 text-orange-600" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                {outlet.name}
                                {!isActive && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full uppercase tracking-wider font-bold">
                                    Dihapus
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {outlet.village}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  outlet.is_open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {outlet.is_open ? <DoorOpen className="w-3 h-3" /> : <DoorClosed className="w-3 h-3" />}
                                  {outlet.is_open ? "Buka" : "Tutup"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {isActive ? (
                              <>
                                <button
                                  onClick={() => toggleOutletOpen(outlet.id)}
                                  className={`p-2 rounded-lg ${outlet.is_open ? 'text-green-600 hover:bg-green-50' : 'text-gray-600 hover:bg-gray-100'}`}
                                  title={outlet.is_open ? "Tutup Outlet" : "Buka Outlet"}
                                >
                                  {outlet.is_open ? <DoorOpen className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleEditOutlet(outlet)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteOutlet(outlet.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={async () => {
                                  if (confirm(`Pulihkan kedai ${outlet.name}?`)) {
                                    try {
                                      await restoreOutlet(outlet.id);
                                    } catch (err: any) {
                                      console.error("Gagal memulihkan kedai", err);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors"
                              >
                                Pulihkan
                              </button>
                            )}
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
                        {isActive && (
                          <div className="pt-3 border-t border-gray-200">
                            <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              <span>Klik untuk kelola menu</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Outlet Modal */}
      {showOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowOutletModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editingOutlet ? "Edit Outlet" : "Tambah Outlet"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Outlet</label>
                <input
                  type="text"
                  value={outletForm.name}
                  onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
                  placeholder="Contoh: Warung Makan Bu Siti"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Desa <span className="text-red-500">*</span></label>
                <select
                  value={outletForm.village}
                  onChange={(e) => setOutletForm({ ...outletForm, village: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">-- Pilih Desa --</option>
                  {VILLAGE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.villages.map((v) => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={outletForm.category}
                  onChange={(e) => setOutletForm({ ...outletForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <optgroup label="Makanan Utama">
                    <option value="Bakso & Mie Ayam">Bakso & Mie Ayam</option>
                    <option value="Nasi Goreng & Mie Goreng">Nasi Goreng & Mie Goreng</option>
                    <option value="Ayam Bakar & Ayam Goreng">Ayam Bakar & Ayam Goreng</option>
                    <option value="Bebek & Ikan">Bebek & Ikan</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Soto & Sop">Soto & Sop</option>
                    <option value="Pecel Lele / Lalapan">Pecel Lele / Lalapan</option>
                    <option value="Rice Bowl & Nasi Kotak">Rice Bowl & Nasi Kotak</option>
                    <option value="Sate & Grill">Sate & Grill</option>
                    <option value="Martabak & Terang Bulan">Martabak & Terang Bulan</option>
                  </optgroup>
                  <optgroup label="Snack & Jajanan">
                    <option value="Snack & Camilan">Snack & Camilan</option>
                    <option value="Gorengan">Gorengan</option>
                    <option value="Cilok, Bakso Bakar & Jajanan">Cilok, Bakso Bakar & Jajanan</option>
                    <option value="Kue & Dessert">Kue & Dessert</option>
                    <option value="Roti & Bakery">Roti & Bakery</option>
                  </optgroup>
                  <optgroup label="Minuman">
                    <option value="Minuman Dingin">Minuman Dingin</option>
                    <option value="Kopi & Teh">Kopi & Teh</option>
                    <option value="Jus & Minuman Buah">Jus & Minuman Buah</option>
                    <option value="Es Campur / Es Tradisional">Es Campur / Es Tradisional</option>
                  </optgroup>
                  <optgroup label="Lainnya">
                    <option value="Frozen Food">Frozen Food</option>
                    <option value="Catering / Nasi Box">Catering / Nasi Box</option>
                  </optgroup>
                </select>
              </div>

              {/* Koordinat Outlet */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Lokasi Koordinat (GPS)</label>
                  <button
                   onClick={() => {
                     if (navigator.geolocation) {
                       toast.info("Mengambil lokasi...");
                       navigator.geolocation.getCurrentPosition(
                         (pos) => {
                           setOutletForm({
                             ...outletForm,
                             latitude: pos.coords.latitude,
                             longitude: pos.coords.longitude
                           });
                           toast.success("Lokasi berhasil diambil!");
                         },
                         (err) => toast.error("Gagal ambil lokasi: " + err.message)
                       );
                     }
                   }}
                   className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Ambil Lokasi Saya</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={outletForm.latitude}
                      onChange={(e) => setOutletForm({ ...outletForm, latitude: e.target.value })}
                      placeholder="Latitude"
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={outletForm.longitude}
                      onChange={(e) => setOutletForm({ ...outletForm, longitude: e.target.value })}
                      placeholder="Longitude"
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  * Buka Google Maps, tahan pada titik lokasi, lalu copy-paste koordinat jika manual.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Outlet</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                  {outletImagePreview ? (
                    <div className="relative">
                      <img src={outletImagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                      <button
                        onClick={() => { setOutletImageFile(null); setOutletImagePreview(null); setOutletForm({ ...outletForm, image_url: null }); }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Klik untuk upload gambar</p>
                      <input type="file" accept="image/*" onChange={handleOutletImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowOutletModal(false)} className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Batal
              </button>
              <button onClick={handleSaveOutlet} disabled={savingOutlet} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50">
                {savingOutlet ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Simpan"}
              </button>
            </div>
          </div>
        </div>
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

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder as any} type={selectedInvoiceType} onClose={() => setShowInvoiceModal(false)} />
      )}

      {/* Manual Order Modal */}
      {showManualOrderModal && (
        <ManualOrderCreation
          onClose={() => setShowManualOrderModal(false)}
          onOrderCreated={(orderId) => {
            setShowManualOrderModal(false);
            toast.success(`Pesanan manual dibuat! ID: ${orderId}`);
          }}
        />
      )}

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <ConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          title="Konfirmasi Logout"
          description="Apakah Anda yakin ingin logout?"
          confirmText="Ya, Logout"
          cancelText="Batal"
          onConfirm={async () => { await logout(); navigate("/login-admin"); }}
          variant="default"
        />
      )}

      {/* Reject Order Confirm */}
      {showRejectOrderConfirm && (
        <ConfirmDialog
          open={!!showRejectOrderConfirm}
          onOpenChange={() => setShowRejectOrderConfirm(null)}
          title="Tolak Pesanan"
          description="Apakah Anda yakin ingin menolak pesanan ini? Pesanan akan dibatalkan."
          confirmText="Ya, Tolak"
          cancelText="Batal"
          onConfirm={() => handleRejectOrder(showRejectOrderConfirm!)}
          variant="destructive"
        />
      )}

      {/* Delete Order Confirm */}
      {showDeleteOrderConfirm && (
        <ConfirmDialog
          open={!!showDeleteOrderConfirm}
          onOpenChange={() => setShowDeleteOrderConfirm(null)}
          title="Hapus Pesanan"
          description="Apakah Anda yakin ingin menghapus pesanan ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={() => handleDeleteOrder(showDeleteOrderConfirm!)}
          variant="destructive"
        />
      )}

      {/* Reject Payment Modal */}
      {showRejectPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowRejectPaymentModal(null); setRejectPaymentReason(""); }} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Tolak Bukti Pembayaran</h2>
              <button onClick={() => { setShowRejectPaymentModal(null); setRejectPaymentReason(""); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <div className="font-semibold mb-1">Alasan penolakan wajib diisi</div>
                    <div>Customer akan melihat alasan ini agar mereka memahami mengapa bukti pembayaran ditolak.</div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alasan Penolakan</label>
                <textarea
                  value={rejectPaymentReason}
                  onChange={(e) => setRejectPaymentReason(e.target.value)}
                  placeholder="Contoh: Jumlah transfer tidak sesuai, nama pengirim berbeda, dll."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowRejectPaymentModal(null); setRejectPaymentReason(""); }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => handleRejectPayment(showRejectPaymentModal!)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rejectPaymentReason.trim()}
              >
                Tolak Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
