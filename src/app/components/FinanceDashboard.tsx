import { useState, useMemo } from "react";
import { Download, TrendingUp, DollarSign, Users, Calendar, FileSpreadsheet } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "../contexts/DataContext";
import { calculateOrderFinance, formatCurrency } from "../utils/financeCalculations";
import * as XLSX from "xlsx";

type TimeFilter = "today" | "week" | "month" | "custom";

export function FinanceDashboard() {
  const { orders, drivers } = useData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Filter orders based on time and driver selection
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let filtered = orders;

    // Time filtering
    if (timeFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(o => new Date(o.timestamp) >= today);
    } else if (timeFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => new Date(o.timestamp) >= weekAgo);
    } else if (timeFilter === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(o => new Date(o.timestamp) >= monthStart);
    } else if (timeFilter === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.timestamp);
        return orderDate >= start && orderDate <= end;
      });
    }

    // Driver filtering
    if (selectedDriver !== "all") {
      filtered = filtered.filter(o => o.driverId === selectedDriver);
    }

    return filtered;
  }, [orders, timeFilter, selectedDriver, customStartDate, customEndDate]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + o.deliveryFee, 0);
    
    let totalAdminProfit = 0;
    let totalDriverEarnings = 0;

    filteredOrders.forEach(order => {
      const finance = calculateOrderFinance(order.subtotal, order.distance);
      totalAdminProfit += finance.adminProfit;
      totalDriverEarnings += finance.driverEarning;
    });

    return {
      totalOrders,
      totalRevenue,
      totalDeliveryFees,
      totalAdminProfit,
      totalDriverEarnings,
    };
  }, [filteredOrders]);

  // Prepare chart data - orders per day
  const ordersPerDay = useMemo(() => {
    const dayMap = new Map<string, { count: number; timestamp: number }>();
    
    filteredOrders.forEach(order => {
      const date = new Date(order.timestamp);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { count: 0, timestamp: date.getTime() });
      }
      const current = dayMap.get(dayKey)!;
      current.count += 1;
    });

    // Sort by timestamp and format for display
    return Array.from(dayMap.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(-7) // Last 7 days
      .map(([dayKey, data]) => {
        const date = new Date(data.timestamp);
        const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        return { 
          dayKey, // Unique key for React
          day: displayDay, // Display label
          count: data.count 
        };
      });
  }, [filteredOrders]);

  // Prepare chart data - income over time
  const incomeOverTime = useMemo(() => {
    const dayMap = new Map<string, { admin: number; driver: number; timestamp: number }>();
    
    filteredOrders.forEach(order => {
      const date = new Date(order.timestamp);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const finance = calculateOrderFinance(order.subtotal, order.distance);
      
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { admin: 0, driver: 0, timestamp: date.getTime() });
      }
      const current = dayMap.get(dayKey)!;
      current.admin += finance.adminProfit;
      current.driver += finance.driverEarning;
    });

    // Sort by timestamp and format for display
    return Array.from(dayMap.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(-7) // Last 7 days
      .map(([dayKey, data]) => {
        const date = new Date(data.timestamp);
        const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        return {
          dayKey, // Unique key for React
          day: displayDay, // Display label
          admin: data.admin,
          driver: data.driver,
        };
      });
  }, [filteredOrders]);

  // Driver statistics
  const driverStats = useMemo(() => {
    const stats = new Map();
    
    filteredOrders.forEach(order => {
      if (!order.driverId || !order.driverName) return;
      
      const finance = calculateOrderFinance(order.subtotal, order.distance);
      const current = stats.get(order.driverId) || {
        name: order.driverName,
        orders: 0,
        earnings: 0,
        setoran: 0,
      };
      
      stats.set(order.driverId, {
        ...current,
        orders: current.orders + 1,
        earnings: current.earnings + finance.driverEarning,
        setoran: current.setoran + finance.driverEarning, // Driver keeps 80%, pays 20% to admin via store payment
      });
    });

    return Array.from(stats.values());
  }, [filteredOrders]);

  // Export to Excel
  const exportToExcel = () => {
    const filterLabel = 
      timeFilter === "today" ? "Hari Ini" :
      timeFilter === "week" ? "Minggu Ini" :
      timeFilter === "month" ? "Bulan Ini" :
      `${customStartDate} sampai ${customEndDate}`;

    // Summary data
    const summaryData = [
      { Info: "Periode", Nilai: filterLabel },
      { Info: "Total Orders", Nilai: metrics.totalOrders },
      { Info: "Total Revenue", Nilai: formatCurrency(metrics.totalRevenue) },
      { Info: "Total Admin Profit", Nilai: formatCurrency(metrics.totalAdminProfit) },
      { Info: "Total Driver Earnings", Nilai: formatCurrency(metrics.totalDriverEarnings) },
      { Info: "Total Delivery Fees", Nilai: formatCurrency(metrics.totalDeliveryFees) },
      {},
    ];

    // Order details
    const orderDetails = filteredOrders.map(order => {
      const finance = calculateOrderFinance(order.subtotal, order.distance);
      return {
        "Order ID": order.id,
        "Tanggal": new Date(order.timestamp).toLocaleString('id-ID'),
        "Customer": order.customerName,
        "Outlet": order.outlet.name,
        "Driver": order.driverName || "-",
        "Subtotal": order.subtotal,
        "Service Fee": order.serviceFee,
        "Delivery Fee": order.deliveryFee,
        "Total": order.total,
        "Admin Profit": finance.adminProfit,
        "Driver Earning": finance.driverEarning,
        "Status": order.status,
        "Payment": order.paymentMethod === "cod" ? "COD" : `Transfer ${order.paymentProvider || ""}`,
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
        "Total Setoran": d.setoran,
      }));
      const wsDrivers = XLSX.utils.json_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, wsDrivers, "Statistik Driver");
    }

    // Download
    const fileName = `SiAnter_Finance_${filterLabel.replace(/\s/g, "_")}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
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

        {/* Time Filter */}
        <div className="space-y-4">
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

      {/* Key Metrics Cards */}
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
          <div className="text-xs opacity-75 mt-1">20% dari delivery fee + service fee</div>
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
              <div className="text-sm text-orange-700">20% delivery fee + service fee (Rp 1.000/order)</div>
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
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Orders</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Earnings</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Setoran</th>
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
                    <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                      {formatCurrency(stat.setoran)}
                    </td>
                  </tr>
                ))}
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