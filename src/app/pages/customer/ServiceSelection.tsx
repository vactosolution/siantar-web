import { useNavigate } from "react-router";
import { ShoppingBag, Package, ArrowRight } from "lucide-react";
import { Logo } from "../../components/Logo";

export function ServiceSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-block bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
            <Logo />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Selamat Datang di SiAnter
          </h1>
          <p className="text-gray-300 text-lg">
            Pilih layanan yang Anda butuhkan
          </p>
        </div>

        {/* Service Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pesan Makanan */}
          <button
            onClick={() => navigate("/home")}
            className="group relative bg-gradient-to-br from-[#FF6A00] to-orange-600 rounded-2xl p-8 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
          >
            <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>

            <div className="mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                <ShoppingBag className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Pesan Makanan
              </h2>
              <p className="text-white/80 text-sm">
                Pesan makanan dan minuman dari outlet favorit Anda
              </p>
            </div>

            <div className="space-y-2 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                <span>Pilih dari berbagai outlet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                <span>Menu lengkap & harga jelas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                <span>Lacak pesanan real-time</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <span className="text-white font-medium flex items-center justify-between">
                <span>Mulai Pesan</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </button>

          {/* Kirim Barang */}
          <button
            onClick={() => navigate("/home/kirim-barang")}
            className="group relative bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 rounded-2xl p-8 hover:shadow-2xl hover:shadow-gray-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border border-white/10"
          >
            <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>

            <div className="mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                <Package className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Kirim Barang
              </h2>
              <p className="text-white/80 text-sm">
                Kirim paket, dokumen, atau barang antar desa
              </p>
            </div>

            <div className="space-y-2 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                <span>Kirim antar desa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                <span>Harga berdasarkan jarak</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                <span>Aman & terpercaya</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <span className="text-white font-medium flex items-center justify-between">
                <span>Kirim Sekarang</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            SiAnter - Layanan Antar Cepat & Terpercaya
          </p>
        </div>
      </div>
    </div>
  );
}
