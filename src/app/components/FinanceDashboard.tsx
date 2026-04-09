import { useState, useMemo } from "react";
import { Download, TrendingUp, DollarSign, Users, Calendar, FileSpreadsheet, Store, Truck } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "../contexts/DataContext";
import { calculateOrderFinance, formatCurrency, getDefaultFeeSettings, type FeeSettings } from "../utils/financeCalculations";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type TimeFilter = "today" | "week" | "month" | "custom";

export function FinanceDashboard() {
  const { orders, outlets, drivers, feeSettings } = useData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const fees: FeeSettings = {
    cost_per_km: feeSettings.cost_per_km ?? getDefaultFeeSettings().cost_per_km,
    service_fee: feeSettings.service_fee ?? getDefaultFeeSettings().service_fee,
    admin_fee: feeSettings.admin_fee ?? getDefaultFeeSettings().admin_fee,
    driver_share_pct: feeSettings.driver_share_pct ?? getDefaultFeeSettings().driver_share_pct,
    admin_share_pct: feeSettings.admin_share_pct ?? getDefaultFeeSettings().admin_share_pct,
    min_distance_km: feeSettings.min_distance_km ?? getDefaultFeeSettings().min_distance_km,
  };

  // Filter orders based on time, outlet, and driver selection
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let filtered = orders;

    // Time filtering
    if (timeFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(o => new Date(o.created_at) >= today);
    } else if (timeFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => new Date(o.created_at) >= weekAgo);
    } else if (timeFilter === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(o => new Date(o.created_at) >= monthStart);
    } else if (timeFilter === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= start && orderDate <= end;
      });
    }

    // Outlet filtering
    if (selectedOutlet !== "all") {
      filtered = filtered.filter(o => o.outlet_id === selectedOutlet);
    }

    // Driver filtering
    if (selectedDriver !== "all") {
      filtered = filtered.filter(o => o.driver_id === selectedDriver);
    }

    return filtered;
  }, [orders, timeFilter, selectedOutlet, selectedDriver, customStartDate, customEndDate]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + (o.delivery_fee ?? 0), 0);
    const totalMarkupIncome = filteredOrders.reduce((sum, o) => sum + (o.service_fee ?? 0), 0);

    let totalAdminFromDelivery = 0;
    let totalDriverEarnings = 0;

    filteredOrders.forEach(order => {
      const adminSharePct = fees.admin_share_pct / 100;
      const driverSharePct = fees.driver_share_pct / 100;
      const adminFromDelivery = (order.delivery_fee ?? 0) * adminSharePct;
      totalAdminFromDelivery += adminFromDelivery + (order.admin_fee ?? 0);
      totalDriverEarnings += (order.delivery_fee ?? 0) * driverSharePct;
    });

    const totalAdminProfit = totalAdminFromDelivery + totalMarkupIncome;

    // Total saldo admin dari setoran driver (akumulasi balances)
    const totalDriverDeposits = drivers.reduce((sum, d) => sum + ((d as any).balance ?? 0), 0);

    return {
      totalOrders,
      totalRevenue,
      totalDeliveryFees,
      totalMarkupIncome,
      totalAdminProfit,
      totalDriverEarnings,
      totalDriverDeposits,
    };
  }, [filteredOrders, fees, drivers]);

  // Prepare chart data - orders per day
  const ordersPerDay = useMemo(() => {
    const dayMap = new Map<string, { count: number; timestamp: number }>();

    filteredOrders.forEach(order => {
      const date = new Date(order.created_at);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { count: 0, timestamp: date.getTime() });
      }
      const current = dayMap.get(dayKey)!;
      current.count += 1;
    });

    return Array.from(dayMap.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(-7)
      .map(([dayKey, data]) => {
        const date = new Date(data.timestamp);
        const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        return {
          dayKey,
          day: displayDay,
          count: data.count
        };
      });
  }, [filteredOrders]);

  // Prepare chart data - income over time
  const incomeOverTime = useMemo(() => {
    const dayMap = new Map<string, { admin: number; driver: number; timestamp: number }>();

    filteredOrders.forEach(order => {
      const date = new Date(order.created_at);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const adminSharePct = fees.admin_share_pct / 100;
      const driverSharePct = fees.driver_share_pct / 100;
      const adminProfit = ((order.delivery_fee ?? 0) * adminSharePct) + (order.service_fee ?? 0) + (order.admin_fee ?? 0);
      const driverEarning = (order.delivery_fee ?? 0) * driverSharePct;

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { admin: 0, driver: 0, timestamp: date.getTime() });
      }
      const current = dayMap.get(dayKey)!;
      current.admin += adminProfit;
      current.driver += driverEarning;
    });

    return Array.from(dayMap.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(-7)
      .map(([dayKey, data]) => {
        const date = new Date(data.timestamp);
        const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        return {
          dayKey,
          day: displayDay,
          admin: data.admin,
          driver: data.driver,
        };
      });
  }, [filteredOrders, fees]);

  // Driver statistics
  const driverStats = useMemo(() => {
    const stats = new Map<string, { 
      name: string; 
      orders: number; 
      earnings: number; 
      setoran: number;
      setoranOngkir: number;
      setoranMarkup: number;
    }>();

    filteredOrders.forEach(order => {
      if (!order.driver_id || !order.driver_name) return;

      const driverSharePct = fees.driver_share_pct / 100;
      const adminSharePct = fees.admin_share_pct / 100;
      const driverEarning = (order.delivery_fee ?? 0) * driverSharePct;
      const adminFromDelivery = (order.delivery_fee ?? 0) * adminSharePct;
      const markupAmount = (order.service_fee ?? 0);
      const setoranAmount = adminFromDelivery + markupAmount + (order.admin_fee ?? 0);

      const current = stats.get(order.driver_id) || {
        name: order.driver_name,
        orders: 0,
        earnings: 0,
        setoran: 0,
        setoranOngkir: 0,
        setoranMarkup: 0,
      };

      stats.set(order.driver_id, {
        ...current,
        orders: current.orders + 1,
        earnings: current.earnings + driverEarning,
        setoran: current.setoran + setoranAmount,
        setoranOngkir: current.setoranOngkir + adminFromDelivery,
        setoranMarkup: current.setoranMarkup + markupAmount,
      });
    });

    return Array.from(stats.values());
  }, [filteredOrders, fees]);
  // Outlet revenue stats
  const outletStats = useMemo(() => {
    const stats = new Map<string, { name: string; orders: number; revenue: number; deliveryFees: number }>();

    filteredOrders.forEach(order => {
      const current = stats.get(order.outlet_id) || {
        name: order.outlet_name,
        orders: 0,
        revenue: 0,
        deliveryFees: 0,
      };

      stats.set(order.outlet_id, {
        ...current,
        orders: current.orders + 1,
        revenue: current.revenue + (order.subtotal ?? 0),
        deliveryFees: current.deliveryFees + (order.delivery_fee ?? 0),
      });
    });

    return Array.from(stats.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Delivery fee breakdown by route
  const deliveryFeeBreakdown = useMemo(() => {
    const routeMap = new Map<string, { count: number; totalFee: number; totalDistance: number; adminShare: number; driverShare: number }>();

    filteredOrders.forEach(order => {
      if (!order.delivery_fee) return;
      const routeKey = order.customer_village || 'Tidak diketahui';
      const adminSharePct = fees.admin_share_pct / 100;
      const driverSharePct = fees.driver_share_pct / 100;

      const current = routeMap.get(routeKey) || {
        count: 0,
        totalFee: 0,
        totalDistance: 0,
        adminShare: 0,
        driverShare: 0,
      };

      routeMap.set(routeKey, {
        count: current.count + 1,
        totalFee: current.totalFee + order.delivery_fee,
        totalDistance: current.totalDistance + (order.distance ?? 0),
        adminShare: current.adminShare + (order.delivery_fee * adminSharePct),
        driverShare: current.driverShare + (order.delivery_fee * driverSharePct),
      });
    });

    return Array.from(routeMap.entries())
      .map(([village, data]) => ({ village, ...data }))
      .sort((a, b) => b.totalFee - a.totalFee);
  }, [filteredOrders, fees]);

  // Export to Excel
  const exportToExcel = () => {
    const filterLabel =
      timeFilter === "today" ? "Hari Ini" :
      timeFilter === "week" ? "Minggu Ini" :
      timeFilter === "month" ? "Bulan Ini" :
      `${customStartDate} sampai ${customEndDate}`;

    const outletLabel = selectedOutlet !== "all"
      ? outlets.find(o => o.id === selectedOutlet)?.name ?? "Unknown"
      : "Semua Outlet";

    // Summary data
    const summaryData = [
      { Info: "Periode", Nilai: filterLabel },
      { Info: "Outlet", Nilai: outletLabel },
      { Info: "Total Orders", Nilai: metrics.totalOrders },
      { Info: "Total Revenue", Nilai: formatCurrency(metrics.totalRevenue) },
      { Info: "Total Admin Profit", Nilai: formatCurrency(metrics.totalAdminProfit) },
      { Info: "Total Driver Earnings", Nilai: formatCurrency(metrics.totalDriverEarnings) },
      { Info: "Total Delivery Fees", Nilai: formatCurrency(metrics.totalDeliveryFees) },
      {},
    ];

    // Order details
    const orderDetails = filteredOrders.map(order => {
      const adminSharePct = fees.admin_share_pct / 100;
      const driverSharePct = fees.driver_share_pct / 100;
      const adminProfit = ((order.delivery_fee ?? 0) * adminSharePct) + (order.service_fee ?? 0) + (order.admin_fee ?? 0);
      const driverEarning = (order.delivery_fee ?? 0) * driverSharePct;
      
      return {
        "Order ID": order.id,
        "Tanggal": new Date(order.created_at).toLocaleString('id-ID'),
        "Customer": order.customer_name,
        "Outlet": order.outlet_name,
        "Driver": order.driver_name || "-",
        "Subtotal": order.subtotal,
        "Service Fee": order.service_fee,
        "Delivery Fee": order.delivery_fee,
        "Total": order.total,
        "Admin Profit": adminProfit,
        "Driver Earning": driverEarning,
        "Status": order.status,
        "Payment": order.payment_method === "cod" ? "COD" : `Transfer ${order.payment_provider || ""}`,
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

    // Orders sheet
    const wsOrders = XLSX.utils.json_to_sheet(orderDetails);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Detail Orders");

    // Driver stats sheet
    if (driverStats.length > 0) {
      const driverData = driverStats.map(d => ({
        "Nama Driver": d.name,
        "Total Orders": d.orders,
        "Total Earnings": d.earnings,
        "Potongan Ongkir (20%)": d.setoranOngkir,
        "Tambahan Markup Menu": d.setoranMarkup,
        "Total Setoran": d.setoran,
      }));
      const wsDrivers = XLSX.utils.json_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, wsDrivers, "Statistik Driver");
    }

    // Download
    const fileName = `SiAnter_Finance_${filterLabel.replace(/\s/g, "_")}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Laporan berhasil diexport ke Excel");
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export to Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Outlet Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Outlet
            </label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">Semua Outlet</option>
              {outlets.map(outlet => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Waktu
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeFilter("today")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "today"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setTimeFilter("week")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "week"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setTimeFilter("month")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "month"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setTimeFilter("custom")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "custom"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          {timeFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Driver Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Driver
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">Semua Driver</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-90">Total Orders</div>
            <FileSpreadsheet className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{metrics.totalOrders}</div>
          <div className="text-xs opacity-75 mt-1">
            {timeFilter === "today" ? "Hari ini" :
             timeFilter === "week" ? "7 hari terakhir" :
             timeFilter === "month" ? "Bulan ini" : "Custom range"}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-90">Total Revenue</div>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          <div className="text-xs opacity-75 mt-1">Semua transaksi</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-90">Admin Profit</div>
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalAdminProfit)}</div>
          <div className="text-xs opacity-75 mt-1">20% ongkir + markup item</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-90">Driver Earnings</div>
            <Users className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalDriverEarnings)}</div>
          <div className="text-xs opacity-75 mt-1">80% dari delivery fee</div>
        </div>
      </div>

      {/* Key Metrics Cards - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-90">Biaya Layanan (Markup)</div>
            <Store className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalMarkupIncome)}</div>
          <div className="text-xs opacity-75 mt-1">Rp1.000/item dari {metrics.totalOrders} order</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm opacity-90">Total Saldo Deposit Driver</div>
            <Truck className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalDriverDeposits)}</div>
          <div className="text-xs opacity-75 mt-1">Akumulasi deposit {drivers.length} driver</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Over Time Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={incomeOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="admin" stroke="#FF6A00" name="Admin Profit" strokeWidth={2} />
              <Line type="monotone" dataKey="driver" stroke="#8B5CF6" name="Driver Earnings" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Per Day Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Per Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#FF6A00" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Breakdown</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Gross Revenue</div>
              <div className="text-sm text-gray-600">Total pendapatan dari semua order</div>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
            <div>
              <div className="font-medium text-orange-900">Admin Profit</div>
              <div className="text-sm text-orange-700">20% ongkir + akumulasi per item</div>
            </div>
            <div className="text-xl font-bold text-orange-600">{formatCurrency(metrics.totalAdminProfit)}</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div>
              <div className="font-medium text-purple-900">Driver Payout</div>
              <div className="text-sm text-purple-700">80% dari delivery fee</div>
            </div>
            <div className="text-xl font-bold text-purple-600">{formatCurrency(metrics.totalDriverEarnings)}</div>
          </div>
        </div>
      </div>

      {/* Driver Statistics */}
      {driverStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Earnings</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Ongkir (20%)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 text-xs">Markup</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Setoran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {driverStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{stat.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{stat.orders}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {formatCurrency(stat.earnings)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {formatCurrency(stat.setoranOngkir)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {formatCurrency(stat.setoranMarkup)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                      {formatCurrency(stat.setoran)}
                    </td>
                  </tr>
                ))}
              </tbody>            </table>
          </div>
        </div>
      )}

      {/* Outlet Revenue Report */}
      {outletStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-500" />
            Pendapatan Per Outlet
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Outlet</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Revenue Menu</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Ongkir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {outletStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{stat.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{stat.orders}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {formatCurrency(stat.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                      {formatCurrency(stat.deliveryFees)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Fee Breakdown */}
      {deliveryFeeBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" />
            Laporan Ongkir Per Wilayah
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Desa Tujuan</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Jumlah</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Jarak</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Ongkir</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Admin (20%)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Driver (80%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveryFeeBreakdown.map((route, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{route.village}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{route.count}x</td>
                    <td className="px-4 py-3 text-right text-gray-600">{route.totalDistance} km</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                      {formatCurrency(route.totalFee)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                      {formatCurrency(route.adminShare)}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-600 font-semibold">
                      {formatCurrency(route.driverShare)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-900">Total</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {deliveryFeeBreakdown.reduce((s, r) => s + r.count, 0)}x
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {deliveryFeeBreakdown.reduce((s, r) => s + r.totalDistance, 0)} km
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(deliveryFeeBreakdown.reduce((s, r) => s + r.totalFee, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {formatCurrency(deliveryFeeBreakdown.reduce((s, r) => s + r.adminShare, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-600">
                    {formatCurrency(deliveryFeeBreakdown.reduce((s, r) => s + r.driverShare, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl shadow-sm p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => {
              setTimeFilter("today");
              setTimeout(exportToExcel, 100);
            }}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span>Daily Report</span>
          </button>
          <button
            onClick={() => {
              setTimeFilter("week");
              setTimeout(exportToExcel, 100);
            }}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span>Weekly Report</span>
          </button>
          <button
            onClick={() => {
              setTimeFilter("month");
              setTimeout(exportToExcel, 100);
            }}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span>Monthly Report</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Custom Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
