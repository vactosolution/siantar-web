import { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, History, Loader2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { formatCurrency } from "../utils/financeCalculations";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  is_active: boolean;
}

interface Transaction {
  id: string;
  driver_id: string;
  type: "deposit" | "withdraw" | "earning" | "penalty" | "bonus";
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function DriverFinanceManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [topUpModal, setTopUpModal] = useState<{ driver: Driver; type: "add" | "deduct" } | null>(null);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver")
      .order("created_at");
    if (!error && data) setDrivers(data);
    setLoading(false);
  };

  const fetchTransactions = async (driverId: string) => {
    const { data, error } = await supabase
      .from("driver_financial_transactions")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTransactions((prev) => ({ ...prev, [driverId]: data as Transaction[] }));
    }
  };

  const handleTopUp = async () => {
    if (!topUpModal || amount <= 0) {
      toast.error("Masukkan jumlah yang valid");
      return;
    }
    setProcessing(true);
    try {
      const finalAmount = topUpModal.type === "deduct" ? -amount : amount;

      const { error: txError } = await supabase.from("driver_financial_transactions").insert({
        driver_id: topUpModal.driver.id,
        type: topUpModal.type === "deduct" ? "withdraw" : "deposit",
        amount: Math.abs(amount),
        notes: notes || null,
      });
      if (txError) throw txError;

      const { error: balanceError } = await supabase.rpc("update_driver_balance", {
        p_driver_id: topUpModal.driver.id,
        p_amount: finalAmount,
      });
      if (balanceError) throw balanceError;

      toast.success(
        `${topUpModal.type === "deduct" ? "Pengurangan" : "Penambahan"} saldo ${formatCurrency(amount)} berhasil`
      );
      setTopUpModal(null);
      setAmount(0);
      setNotes("");
      fetchDrivers();
      if (expandedDriver) fetchTransactions(expandedDriver);
    } catch (error: any) {
      toast.error(error.message || "Gagal memproses transaksi");
    } finally {
      setProcessing(false);
    }
  };

  const toggleHistory = async (driverId: string) => {
    if (expandedDriver === driverId) {
      setExpandedDriver(null);
    } else {
      setExpandedDriver(driverId);
      if (!transactions[driverId]) {
        await fetchTransactions(driverId);
      }
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "deposit": return "Deposit";
      case "withdraw": return "Penarikan";
      case "earning": return "Pendapatan";
      case "penalty": return "Denda";
      case "bonus": return "Bonus";
      default: return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "deposit": return "bg-green-100 text-green-700";
      case "withdraw": return "bg-red-100 text-red-700";
      case "earning": return "bg-blue-100 text-blue-700";
      case "penalty": return "bg-yellow-100 text-yellow-700";
      case "bonus": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Keuangan Driver</h2>
          <p className="text-sm text-gray-600 mt-1">Kelola saldo dan transaksi driver</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Saldo</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {drivers.map((driver) => (
              <>
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{driver.name}</div>
                    <div className="text-xs text-gray-500">{driver.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${driver.balance < 30000 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(driver.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      driver.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {driver.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setTopUpModal({ driver, type: "add" })}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Tambah Saldo"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTopUpModal({ driver, type: "deduct" })}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Kurangi Saldo"
                      >
                        <TrendingDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleHistory(driver.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Riwayat"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedDriver === driver.id && transactions[driver.id] && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 bg-gray-50">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700 text-sm">Riwayat Transaksi</h4>
                        {transactions[driver.id].length === 0 ? (
                          <p className="text-sm text-gray-500">Belum ada transaksi</p>
                        ) : (
                          transactions[driver.id].map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(tx.type)}`}>
                                  {getTypeLabel(tx.type)}
                                </span>
                                <div>
                                  <div className="text-sm font-medium">{formatCurrency(tx.amount)}</div>
                                  {tx.notes && <div className="text-xs text-gray-500">{tx.notes}</div>}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">{formatDate(tx.created_at)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {drivers.length === 0 && (
          <p className="text-gray-500 text-center py-8">Tidak ada driver</p>
        )}
      </div>

      {/* Top Up / Deduct Modal */}
      {topUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTopUpModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {topUpModal.type === "add" ? "Tambah Saldo" : "Kurangi Saldo"}
              </h2>
              <button onClick={() => setTopUpModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">Driver: <span className="font-medium">{topUpModal.driver.name}</span></p>
            <p className="text-sm text-gray-600 mb-4">Saldo saat ini: <span className="font-bold">{formatCurrency(topUpModal.driver.balance)}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah (Rp)</label>
                <input
                  type="number"
                  value={amount === 0 ? "" : amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Masukkan jumlah"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan (opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Contoh: Top up deposit"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">Saldo setelah transaksi:</div>
                <div className={`text-xl font-bold ${
                  topUpModal.type === "deduct" && topUpModal.driver.balance - amount < 0
                    ? "text-red-600"
                    : "text-blue-600"
                }`}>
                  {formatCurrency(topUpModal.type === "add" ? topUpModal.driver.balance + amount : topUpModal.driver.balance - amount)}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTopUpModal(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleTopUp}
                disabled={processing || amount <= 0}
                className={`flex-1 px-4 py-3 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
                  topUpModal.type === "add"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                <span>{processing ? "Memproses..." : "Konfirmasi"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
