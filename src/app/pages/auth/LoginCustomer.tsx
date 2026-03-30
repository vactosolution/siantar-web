import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { User, Phone, AlertCircle } from "lucide-react";
import { Logo } from "../../components/Logo";

export function LoginCustomer() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !phoneNumber) {
      setError("Mohon lengkapi nama dan nomor HP");
      return;
    }

    // Simple login - just store the name
    if (login("customer", name, phoneNumber)) {
      navigate("/service-selection");
    } else {
      setError("Gagal masuk, silakan coba lagi");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="xl" className="mb-4 filter brightness-0 invert" />
          <p className="text-gray-300 text-lg">Pesan Antar Cepat & Mudah</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang!</h2>
            <p className="text-gray-600 text-sm">Masukkan data untuk melanjutkan</p>
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
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor HP
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08xx xxxx xxxx"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-[#FF6A00] to-[#FF8534] text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all font-semibold text-lg"
            >
              Masuk
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">Login sebagai:</p>
            <div className="flex flex-col gap-2 text-sm text-center">
              <Link
                to="/login-admin"
                className="text-gray-600 hover:text-[#FF6A00] transition-colors font-medium"
              >
                Admin Panel →
              </Link>
              <Link
                to="/login-driver"
                className="text-gray-600 hover:text-[#FF6A00] transition-colors font-medium"
              >
                Driver Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}