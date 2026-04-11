import { useData } from "../../contexts/DataContext";
import { Logo } from "../../components/Logo";
import { DoorClosed, Clock } from "lucide-react";

export function ServiceClosed() {
  const { appSettings } = useData();

  const message = appSettings.service_closed_message || "Saat ini layanan SiAnter sedang tutup sementara.";
  const hours = appSettings.service_hours || "Silakan kembali lagi pada jam operasional berikutnya.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8">
        <Logo size="3xl" />
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-orange-100">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <DoorClosed className="w-10 h-10 text-orange-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Layanan Sedang Tutup</h1>
        
        <div className="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">
          {message}
        </div>

        <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3 justify-center border border-orange-100">
          <Clock className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-orange-900">{hours}</span>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Terima kasih atas pengertiannya ✨
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="mt-8 text-orange-600 font-medium hover:underline"
      >
        Coba Segarkan Halaman
      </button>
    </div>
  );
}
