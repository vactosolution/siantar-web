import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, CreditCard, DollarSign, Save, Loader2, Plus, Trash2, Edit2, X, MapPin } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Logo } from "../../components/Logo";
import { formatCurrency } from "../../utils/financeCalculations";

export function Settings() {
  const { role, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { paymentAccounts, refreshPaymentAccounts, feeSettings, refreshFeeSettings, distanceMatrix, refreshDistanceMatrix } = useData();

  const [loading, setLoading] = useState(false);
  const [feeForm, setFeeForm] = useState({
    cost_per_km: 2000,
    service_fee: 2000,
    admin_fee: 2000,
    driver_share_pct: 80,
    admin_share_pct: 20,
    min_distance_km: 1,
  });

  // Payment account form
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [accountForm, setAccountForm] = useState({
    provider: "BRI" as "BRI" | "DANA",
    account_number: "",
    account_name: "",
    is_active: true,
  });

  // Distance fee editing
  const [editingFee, setEditingFee] = useState<{ id: string; from: string; to: string; fee: number } | null>(null);
  const [newFee, setNewFee] = useState(0);
  const [savingFee, setSavingFee] = useState(false);

  // Get unique villages from distance matrix
  const villages = Array.from(new Set(distanceMatrix.map((d) => d.from_village))).sort();

  useEffect(() => {
    if (!isAuthenticated || role !== "admin") {
      navigate("/login-admin");
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    if (Object.keys(feeSettings).length > 0) {
      setFeeForm({
        cost_per_km: feeSettings.cost_per_km || 2000,
        service_fee: feeSettings.service_fee || 2000,
        admin_fee: feeSettings.admin_fee || 2000,
        driver_share_pct: feeSettings.driver_share_pct || 80,
        admin_share_pct: feeSettings.admin_share_pct || 20,
        min_distance_km: feeSettings.min_distance_km || 1,
      });
    }
  }, [feeSettings]);

  const handleSaveFees = async () => {
    setLoading(true);
    try {
      for (const [key, value] of Object.entries(feeForm)) {
        const parsedValue = parseInt(String(value)) || 0;
        
        const { error } = await supabase
          .from("fee_settings")
          .upsert({ key, value: parsedValue, updated_at: new Date().toISOString() }, { onConflict: "key" });

        if (error) {
          console.error(`Error upserting ${key}:`, error);
          throw error;
        }
      }
      
      await refreshFeeSettings();
      toast.success("Pengaturan fee berhasil disimpan");
    } catch (err: any) {
      console.error("Error saving fees:", err);
      toast.error(err.message || "Gagal menyimpan");
    }
    setLoading(false);
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({ provider: "BRI", account_number: "", account_name: "", is_active: true });
    setShowAccountModal(true);
  };

  const handleEditAccount = (acc: any) => {
    setEditingAccount(acc);
    setAccountForm({
      provider: acc.provider,
      account_number: acc.account_number,
      account_name: acc.account_name,
      is_active: acc.is_active,
    });
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    if (!accountForm.account_number || !accountForm.account_name) {
      toast.error("Mohon lengkapi semua data");
      return;
    }
    setLoading(true);
    try {
      if (editingAccount) {
        await supabase.from("payment_accounts").update(accountForm).eq("id", editingAccount.id);
        toast.success("Akun pembayaran diupdate");
      } else {
        await supabase.from("payment_accounts").insert(accountForm);
        toast.success("Akun pembayaran ditambahkan");
      }
      await refreshPaymentAccounts();
      setShowAccountModal(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
    setLoading(false);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Yakin ingin menghapus akun pembayaran ini?")) return;
    try {
      await supabase.from("payment_accounts").delete().eq("id", id);
      await refreshPaymentAccounts();
      toast.success("Akun pembayaran dihapus");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveDistanceFee = async () => {
    if (!editingFee || newFee <= 0) return;
    setSavingFee(true);
    try {
      await supabase.from("distance_matrix").update({ fee: newFee }).eq("id", editingFee.id);
      await refreshDistanceMatrix();
      toast.success("Ongkir berhasil diupdate");
      setEditingFee(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan ongkir");
    } finally {
      setSavingFee(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Logo size="sm" />
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 lg:p-8 space-y-8">
        {/* Payment Accounts */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">Akun Pembayaran</h2>
            </div>
            <button onClick={handleAddAccount} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>
          <div className="space-y-3">
            {paymentAccounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{acc.provider} - {acc.account_name}</div>
                  <div className="text-sm text-gray-600">{acc.account_number}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${acc.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {acc.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditAccount(acc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {paymentAccounts.length === 0 && <p className="text-gray-500 text-center py-4">Belum ada akun pembayaran</p>}
          </div>
        </section>

        {/* Fee Configuration */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-6 h-6 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Konfigurasi Fee</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biaya per KM (Rp)</label>
              <input type="number" value={feeForm.cost_per_km} onChange={(e) => setFeeForm({ ...feeForm, cost_per_km: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Fee (Rp)</label>
              <input type="number" value={feeForm.service_fee} onChange={(e) => setFeeForm({ ...feeForm, service_fee: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Fee per Pesanan (Rp)</label>
              <input type="number" value={feeForm.admin_fee} onChange={(e) => setFeeForm({ ...feeForm, admin_fee: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver Share (%)</label>
              <input type="number" value={feeForm.driver_share_pct} onChange={(e) => setFeeForm({ ...feeForm, driver_share_pct: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Share (%)</label>
              <input type="number" value={feeForm.admin_share_pct} onChange={(e) => setFeeForm({ ...feeForm, admin_share_pct: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Jarak (km)</label>
              <input type="number" value={feeForm.min_distance_km} onChange={(e) => setFeeForm({ ...feeForm, min_distance_km: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <button onClick={handleSaveFees} disabled={loading} className="mt-6 flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>Simpan Pengaturan</span>
          </button>
        </section>

        {/* Distance Fee Matrix */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Ongkir Per Desa</h2>
          </div>
          <div className="space-y-6">
            {villages.map((fromVillage) => (
              <div key={fromVillage} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Dari {fromVillage}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {distanceMatrix
                    .filter((d) => d.from_village === fromVillage)
                    .sort((a, b) => a.to_village.localeCompare(b.to_village))
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="text-sm text-gray-600">Ke {entry.to_village.replace("Desa ", "")}</div>
                          <div className="font-bold text-gray-900">{formatCurrency(entry.fee)}</div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingFee({ id: entry.id, from: entry.from_village, to: entry.to_village, fee: entry.fee });
                            setNewFee(entry.fee);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAccountModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{editingAccount ? "Edit" : "Tambah"} Akun Pembayaran</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select value={accountForm.provider} onChange={(e) => setAccountForm({ ...accountForm, provider: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                  <option value="BRI">Bank BRI</option>
                  <option value="DANA">DANA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Rekening / Akun</label>
                <input type="text" value={accountForm.account_number} onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  placeholder="1234567890" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pemilik</label>
                <input type="text" value={accountForm.account_name} onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  placeholder="SIANTER OFFICIAL" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAccountModal(false)} className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Batal
              </button>
              <button onClick={handleSaveAccount} disabled={loading} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distance Fee Edit Modal */}
      {editingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingFee(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Ongkir</h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Rute</div>
                <div className="font-medium text-gray-900">
                  {editingFee.from} → {editingFee.to}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ongkir Baru (Rp)</label>
                <input
                  type="number"
                  value={newFee}
                  onChange={(e) => setNewFee(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                Ongkir lama: {formatCurrency(editingFee.fee)}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingFee(null)} className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Batal
              </button>
              <button
                onClick={handleSaveDistanceFee}
                disabled={savingFee || newFee <= 0}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingFee ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
