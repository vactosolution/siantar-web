import { useData } from "../../contexts/DataContext";
import { Logo } from "../../components/Logo";
import { DoorClosed, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function ServiceClosed() {
  const { appSettings } = useData();

  const message = appSettings.service_closed_message || "Saat ini layanan SiAnter sedang tutup sementara.";
  const hours = appSettings.service_hours || "Silakan kembali lagi pada jam operasional berikutnya.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8">
        <Logo size="3xl" />
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border border-orange-100 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-8 -mt-8 opacity-50" />
        
        <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
          <DoorClosed className="w-10 h-10 text-orange-600 -rotate-3" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Layanan Sedang Istirahat</h1>
        
        <div className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed text-sm">
          {message}
        </div>

        <div className="bg-orange-50 rounded-2xl p-4 flex items-center gap-3 justify-center border border-orange-100 mb-10">
          <Clock className="w-5 h-5 text-orange-600" />
          <span className="font-bold text-orange-900">{hours}</span>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Jika sudah jam buka, tekan tombol ini:
          </p>
          <Link
            to="/"
            className="group flex items-center justify-center gap-3 w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            Masuk Sekarang
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-400 font-medium">
          Ditunggu pesanan kesayanganmu! ✨
        </p>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        Butuh bantuan segera? <a href="https://wa.me/628123456789" className="text-orange-600 font-bold hover:underline">Hubungi Admin</a>
      </p>
    </div>
  );
}
