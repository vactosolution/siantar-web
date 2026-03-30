import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { Phone, Lock, AlertCircle, Truck, User } from "lucide-react";
import { Logo } from "../../components/Logo";
import { verifyPassword, generateSessionId } from "../../utils/credentialGenerator";

export function LoginDriver() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setDriverAuth } = useAuth();
  const { getDriverByUsername, updateDriverSession } = useData();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Find driver by username
    const driver = getDriverByUsername(username);
    
    if (!driver) {
      setError("Username tidak ditemukan");
      return;
    }

    if (!driver.isActive) {
      setError("Akun tidak aktif. Hubungi admin.");
      return;
    }

    // Verify password
    if (!verifyPassword(password, driver.passwordHash)) {
      setError("Password salah");
      return;
    }

    // Generate new session
    const newSessionId = generateSessionId();

    // Update driver session in database
    updateDriverSession(driver.id, newSessionId);

    // Set auth state
    setDriverAuth(driver.username, driver.id, newSessionId);

    // Navigate to driver panel
    navigate("/driver");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#FF6A00] to-[#FF8534] rounded-3xl mb-4 shadow-2xl">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <Logo size="xl" className="mb-3 filter brightness-0 invert" />
          <p className="text-gray-300 text-lg">Driver Portal</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Driver</h2>
            <p className="text-gray-600 text-sm">Masuk dengan kredensial yang diberikan admin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="driver_nama"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-[#FF6A00] to-[#FF8534] text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all font-semibold text-lg"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="mb-2">Demo credentials:</p>
            <div className="font-mono text-xs bg-gray-100 p-3 rounded-lg">
              driver123 (any phone)
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">Login sebagai:</p>
            <div className="flex flex-col gap-2 text-sm text-center">
              <Link
                to="/login-customer"
                className="text-gray-600 hover:text-[#FF6A00] transition-colors font-medium"
              >
                Customer →
              </Link>
              <Link
                to="/login-admin"
                className="text-gray-600 hover:text-[#FF6A00] transition-colors font-medium"
              >
                Admin Panel →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}