import { useState } from "react";
import { User, Phone, Plus, Edit2, Trash2, Key, Copy, Check, Lock, AlertCircle, X, Shield } from "lucide-react";
import { Driver, Order } from "../contexts/DataContext";
import { formatCurrency } from "../utils/financeCalculations";
import { generateDriverUsername, generateSecurePassword, hashPassword } from "../utils/credentialGenerator";

interface DriverManagementProps {
  drivers: Driver[];
  orders: Order[];
  onAddDriver: (driver: Omit<Driver, "id" | "ordersToday" | "weeklyOrders" | "totalEarningToday" | "createdAt" | "status">) => void;
  onUpdateDriver: (id: string, driver: Partial<Driver>) => void;
  onDeactivateDriver: (id: string) => void;
  onResetCredentials: (id: string, newUsername: string, newPasswordHash: string) => void;
}

export function DriverManagement({
  drivers,
  orders,
  onAddDriver,
  onUpdateDriver,
  onDeactivateDriver,
  onResetCredentials,
}: DriverManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
  });

  const handleAddDriver = () => {
    if (!driverForm.name || !driverForm.phone) {
      alert("Mohon lengkapi nama dan nomor HP");
      return;
    }

    // Generate unique username
    const existingUsernames = drivers.map(d => d.username);
    const username = generateDriverUsername(driverForm.name, existingUsernames);
    
    // Generate secure password
    const password = generateSecurePassword();
    const passwordHash = hashPassword(password);

    // Add driver
    onAddDriver({
      name: driverForm.name,
      phone: driverForm.phone,
      username,
      passwordHash,
      isActive: true,
    });

    // Store credentials to show to admin
    setGeneratedCredentials({ username, password });
    setShowAddModal(false);
    setShowCredentialsModal(true);
    
    // Reset form
    setDriverForm({ name: "", phone: "" });
  };

  const handleCopyCredential = (field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    if (!generatedCredentials) return;
    const text = `Username: ${generatedCredentials.username}\nPassword: ${generatedCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
    });
    setShowEditModal(true);
  };

  const handleUpdateDriver = () => {
    if (!editingDriver) return;
    if (!driverForm.name || !driverForm.phone) {
      alert("Mohon lengkapi nama dan nomor HP");
      return;
    }

    onUpdateDriver(editingDriver.id, {
      name: driverForm.name,
      phone: driverForm.phone,
    });

    setShowEditModal(false);
    setEditingDriver(null);
    setDriverForm({ name: "", phone: "" });
  };

  const handleDeactivateDriver = (driver: Driver) => {
    if (confirm(`Yakin ingin ${driver.isActive ? 'menonaktifkan' : 'mengaktifkan'} driver ${driver.name}?`)) {
      onUpdateDriver(driver.id, { isActive: !driver.isActive });
    }
  };

  const handleResetCredentials = (driver: Driver) => {
    if (!confirm(`Yakin ingin reset kredensial untuk ${driver.name}? Kredensial lama tidak akan bisa digunakan lagi.`)) {
      return;
    }

    // Generate new credentials
    const existingUsernames = drivers.filter(d => d.id !== driver.id).map(d => d.username);
    const newUsername = generateDriverUsername(driver.name, existingUsernames);
    const newPassword = generateSecurePassword();
    const newPasswordHash = hashPassword(newPassword);

    // Reset credentials
    onResetCredentials(driver.id, newUsername, newPasswordHash);

    // Show new credentials to admin
    setGeneratedCredentials({ username: newUsername, password: newPassword });
    setShowCredentialsModal(true);
  };

  const getDriverStats = (driverId: string) => {
    const driverOrders = orders.filter(o => o.driverId === driverId);
    const completedOrders = driverOrders.filter(o => o.status === "completed");
    const activeOrders = driverOrders.filter(o => o.status !== "completed" && o.status !== "pending");
    
    return {
      totalOrders: driverOrders.length,
      completed: completedOrders.length,
      active: activeOrders.length,
    };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manajemen Driver</h2>
          <p className="text-sm text-gray-600 mt-1">Kelola akun dan kredensial driver</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Driver</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {drivers.map((driver) => {
          const stats = getDriverStats(driver.id);
          
          return (
            <div
              key={driver.id}
              className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
                driver.isActive ? "border-transparent" : "border-red-300 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    driver.isActive ? "bg-orange-100" : "bg-gray-100"
                  }`}>
                    <User className={`w-6 h-6 ${driver.isActive ? "text-orange-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {driver.name}
                      {!driver.isActive && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{driver.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <User className="w-3 h-3" />
                      <span className="font-mono">{driver.username}</span>
                    </div>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    driver.status === "online"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {driver.status === "online" ? "Online" : "Offline"}
                </div>
              </div>

              {/* Driver Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Total Order</div>
                  <div className="text-xl font-bold text-blue-600">{stats.totalOrders}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Selesai</div>
                  <div className="text-xl font-bold text-green-600">{stats.completed}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Aktif</div>
                  <div className="text-xl font-bold text-orange-600">{stats.active}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditDriver(driver)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleResetCredentials(driver)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm"
                >
                  <Key className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() => handleDeactivateDriver(driver)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    driver.isActive
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{driver.isActive ? "Nonaktifkan" : "Aktifkan"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tambah Driver Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="Contoh: Pak Ahmad"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor HP <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="08xx-xxxx-xxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <div className="font-semibold mb-1">Kredensial akan dibuat otomatis</div>
                    <div className="text-blue-700">
                      Sistem akan generate username dan password yang aman. Anda akan melihat kredensial setelah driver dibuat.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleAddDriver}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Tambah Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Driver</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor HP <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Username (tidak dapat diubah):</div>
                <div className="font-mono text-sm text-gray-900">{editingDriver.username}</div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDriver(null);
                  setDriverForm({ name: "", phone: "" });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateDriver}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && generatedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setShowCredentialsModal(false);
              setGeneratedCredentials(null);
            }}
          />
          <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Kredensial Driver</h2>
                <p className="text-orange-100 text-sm">Simpan kredensial ini dengan aman</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-orange-100 mb-2">
                  Username
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/20 backdrop-blur px-4 py-3 rounded-lg font-mono text-lg">
                    {generatedCredentials.username}
                  </div>
                  <button
                    onClick={() => handleCopyCredential("username", generatedCredentials.username)}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    {copiedField === "username" ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-orange-100 mb-2">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/20 backdrop-blur px-4 py-3 rounded-lg font-mono text-lg">
                    {generatedCredentials.password}
                  </div>
                  <button
                    onClick={() => handleCopyCredential("password", generatedCredentials.password)}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur border-2 border-white/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold mb-1">⚠️ Penting!</div>
                  <ul className="list-disc list-inside space-y-1 text-white/90">
                    <li>Simpan kredensial ini dengan aman</li>
                    <li>Berikan ke driver yang bersangkutan</li>
                    <li>Password tidak dapat dilihat lagi setelah ditutup</li>
                    <li>Driver harus login dengan kredensial ini</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyAll}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-medium"
              >
                {copiedField === "all" ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Salin Semua</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setGeneratedCredentials(null);
                }}
                className="flex-1 px-4 py-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
