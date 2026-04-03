import { useState, useEffect } from "react";
import { Plus, Bell, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "promo" | "order" | "system";
  target_role: "customer" | "driver" | "all";
  is_read: boolean;
  customer_phone: string | null;
  order_id: string | null;
  created_at: string;
}

export function NotificationManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info" as Notification["type"],
    target_role: "customer" as Notification["target_role"],
    customer_phone: "",
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!form.title || !form.message) {
      toast.error("Mohon lengkapi judul dan pesan");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        title: form.title,
        message: form.message,
        type: form.type,
        target_role: form.target_role,
        customer_phone: form.customer_phone || null,
      });
      if (error) throw error;
      toast.success("Notifikasi berhasil dikirim");
      setForm({ title: "", message: "", type: "info", target_role: "customer", customer_phone: "" });
      fetchNotifications();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim notifikasi");
    } finally {
      setSending(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "info": return "bg-blue-100 text-blue-700";
      case "promo": return "bg-green-100 text-green-700";
      case "order": return "bg-orange-100 text-orange-700";
      case "system": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case "customer": return "Customer";
      case "driver": return "Driver";
      case "all": return "Semua";
      default: return target;
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Manajemen Notifikasi</h2>
        <p className="text-sm text-gray-600">Kirim notifikasi ke customer atau driver</p>
      </div>

      {/* Send Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Kirim Notifikasi Baru</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Judul</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contoh: Promo Spesial!"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pesan</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Isi notifikasi..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Notification["type"] })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="info">Info</option>
                <option value="promo">Promo</option>
                <option value="order">Order</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target</label>
              <select
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value as Notification["target_role"] })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="customer">Semua Customer</option>
                <option value="driver">Semua Driver</option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor HP Customer (opsional)
            </label>
            <input
              type="text"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              placeholder="08xx-xxxx-xxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">Kosongkan untuk mengirim ke semua target</p>
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
            <span>{sending ? "Mengirim..." : "Kirim Notifikasi"}</span>
          </button>
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Riwayat Notifikasi</h3>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Belum ada notifikasi terkirim</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(notif.type)}`}>
                      {notif.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      Target: {getTargetLabel(notif.target_role)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(notif.created_at)}</span>
                </div>
                <div className="font-medium text-gray-900">{notif.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notif.message}</div>
                {notif.customer_phone && (
                  <div className="text-xs text-gray-500 mt-1">HP: {notif.customer_phone}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
