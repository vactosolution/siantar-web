import { useState } from "react";
import { Star, X, MessageSquare, Loader2 } from "lucide-react";
import { useData } from "../contexts/DataContext";
import { toast } from "sonner";

interface OrderRatingModalProps {
  orderId: string;
  driverId: string | null;
  outletId: string | null;
  customerPhone: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function OrderRatingModal({
  orderId,
  driverId,
  outletId,
  customerPhone,
  onClose,
  onSuccess,
}: OrderRatingModalProps) {
  const { submitOrderRating } = useData();
  const [driverRating, setDriverRating] = useState(0);
  const [outletRating, setOutletRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (driverRating === 0 || outletRating === 0) {
      toast.error("Mohon berikan rating bintang untuk driver dan outlet");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitOrderRating({
        order_id: orderId,
        driver_id: driverId,
        outlet_id: outletId,
        customer_phone: customerPhone,
        driver_rating: driverRating,
        outlet_rating: outletRating,
        comment: comment.trim() || null,
      });
      toast.success("Terima kasih atas penilaian Anda! ✨");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Rating submission error:", error);
      toast.error(error.message || "Gagal mengirim penilaian");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Pesanan Selesai!</h2>
          <p className="text-orange-100 text-sm mt-1">Bagaimana pengalaman Anda?</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Driver Rating */}
          <div className="text-center">
            <h3 className="font-bold text-gray-900 mb-3">Rating Driver</h3>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setDriverRating(star)}
                  className="transition-transform active:scale-125"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= driverRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              (Pelayanan & Kecepatan Pengantaran)
            </p>
          </div>

          {/* Outlet Rating */}
          <div className="text-center">
            <h3 className="font-bold text-gray-900 mb-3">Rating Makanan / Outlet</h3>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setOutletRating(star)}
                  className="transition-transform active:scale-125"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= outletRating
                        ? "fill-orange-500 text-orange-500"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              (Kualitas & Rasa Makanan)
            </p>
          </div>

          {/* Comment */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              Tulis ulasan singkat (opsional)
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Berikan masukan untuk kami..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
              rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mengirim...
              </>
            ) : (
              "Kirim Penilaian"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
