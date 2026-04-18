import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useTitle } from "../../hooks/useTitle";
import { ArrowLeft, CreditCard, DollarSign, Save, Loader2, Plus, Trash2, Edit2, X, MapPin, Tag, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Logo } from "../../components/Logo";
import { formatCurrency } from "../../utils/financeCalculations";

export function Settings() {
  useTitle("Pengaturan");

  const { role, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { paymentAccounts, refreshPaymentAccounts, feeSettings, refreshFeeSettings, outlets, updateOutlet } = useData();
  const [markupLoading, setMarkupLoading] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [feeForm, setFeeForm] = useState({
    cost_per_km: 2000,
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

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || role !== "admin") {
      navigate("/login-admin");
    }
  }, [isAuthenticated, role, navigate, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  useEffect(() => {
    if (Object.keys(feeSettings).length > 0) {
      setFeeForm({
        cost_per_km: feeSettings.cost_per_km || 2000,
        driver_share_pct: feeSettings.driver_share_pct || 80,
        admin_share_pct: feeSettings.admin_share_pct || 20,
        min_distance_km: feeSettings.min_distance_km || 1,
      });
    }
  }, [feeSettings]);

  const handleToggleMarkup = async (outletId: string, currentValue: boolean) => {
    setMarkupLoading(outletId);
    try {
      await updateOutlet(outletId, { markup_enabled: !currentValue } as any);
      toast.success(`Markup ${!currentValue ? 'diaktifkan' : 'dinonaktifkan'} untuk outlet ini`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah markup");
    } finally {
      setMarkupLoading(null);
    }
  };

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
          <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <strong>Info:</strong> Markup Rp1.000/item dikenakan otomatis ke semua menu (bisa diatur per outlet di bawah). Service Fee & Admin Fee tetap dihapus.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biaya per KM (Rp)</label>
              <input type="number" value={feeForm.cost_per_km} onChange={(e) => setFeeForm({ ...feeForm, cost_per_km: parseInt(e.target.value) || 0 })}
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

        {/* Markup Toggle Per Outlet */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="w-6 h-6 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Toggle Markup Per Outlet</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Aktifkan/nonaktifkan markup <strong>Rp1.000 per item</strong> pada setiap outlet. Jika OFF, customer membayar harga asli outlet.</p>
          <div className="space-y-3">
            {outlets.map((outlet) => {
              const isOn = (outlet as any).markup_enabled !== false;
              return (
                <div key={outlet.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{outlet.name}</div>
                    <div className="text-sm text-gray-500">{outlet.village}</div>
                  </div>
                  <button
                    onClick={() => handleToggleMarkup(outlet.id, isOn)}
                    disabled={markupLoading === outlet.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      isOn ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    {markupLoading === outlet.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isOn ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    <span>Markup {isOn ? 'ON (+Rp1.000/item)' : 'OFF (Harga Asli)'}</span>
                  </button>
                </div>
              );
            })}
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
    </div>
  );
}
