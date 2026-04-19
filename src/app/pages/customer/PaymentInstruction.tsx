import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useTitle } from "../../hooks/useTitle";
import { ArrowLeft, Copy, Check, Upload, MessageCircle, X, AlertCircle, CreditCard, Clock, Loader2 } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import { formatCurrency } from "../../utils/financeCalculations";
import { uploadFile } from "../../../lib/supabase";
import { toast } from "sonner";

export function PaymentInstruction() {
  useTitle("Instruksi Pembayaran");
  const { orderId } = useParams<{ orderId: string }>();

  const navigate = useNavigate();
  const { orders, updateOrder, paymentAccounts } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const order = orders.find((o) => o.id === orderId);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Pesanan tidak ditemukan</p>
          <button
            onClick={() => navigate("/home")}
            className="mt-4 text-orange-600 hover:text-orange-700"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Get payment account from paymentAccounts matching order's payment_provider
  const currentPaymentAccount = order.payment_provider
    ? paymentAccounts.find((a) => a.provider === order.payment_provider && a.is_active)
    : null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Mohon pilih file gambar (JPG/PNG)");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedFile || !previewImage) {
      toast.error("Mohon pilih gambar bukti transfer");
      return;
    }

    setIsUploading(true);

    try {
      const path = `${order.id}/${Date.now()}-${selectedFile.name}`;
      const url = await uploadFile("payment-proofs", path, selectedFile);

      await updateOrder(order.id, {
        payment_proof_url: url,
        payment_status: "waiting_confirmation",
        payment_rejection_reason: null,
      });

      setUploadedImage(url);
      setPreviewImage(null);
      setSelectedFile(null);
      toast.success("Bukti pembayaran berhasil diupload! Menunggu konfirmasi admin.");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Gagal mengupload bukti pembayaran. Silakan coba lagi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = `Halo, saya ingin konfirmasi pembayaran:\n\nOrder ID: ${order.id}\nNama: ${order.customer_name}\nJumlah Transfer: ${formatCurrency(order.final_payment_amount || order.total)}\n\nTerima kasih!`;
    const phoneNumber = "6281234567890";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleContinueToTracking = () => {
    navigate(`/home/tracking/${order.id}`);
  };

  // Get provider icon and label from account data
  const getProviderInfo = (provider: string) => {
    if (provider === "BRI") return { icon: "🏦", label: "Bank BRI" };
    if (provider === "DANA") return { icon: "💳", label: "DANA E-Wallet" };
    return { icon: "💰", label: provider };
  };

  const providerInfo = currentPaymentAccount
    ? getProviderInfo(currentPaymentAccount.provider)
    : null;

  return (
    <div className="pb-20 md:pb-8 min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Konfirmasi Pembayaran
          </h1>
          <p className="text-gray-600">
            Order #{order.id}
          </p>
        </div>

        {/* Payment Status - Show if already uploaded */}
        {order.status !== "cancelled" && order.payment_status === "awaiting_admin_confirmation" && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-orange-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-orange-900 text-lg mb-1">
                  Menunggu Konfirmasi Pesanan
                </h3>
                <p className="text-orange-700 text-sm leading-relaxed">
                  Admin sedang mengecek ketersediaan driver dan kedai. Mohon tunggu sebentar, halaman ini akan otomatis memuat instruksi transfer setelah pesanan dikonfirmasi.
                </p>
                <button
                  onClick={handleWhatsApp}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-bold"
                >
                  <MessageCircle className="w-4 h-4" />
                  Hubungi Admin (WhatsApp)
                </button>
              </div>
            </div>
          </div>
        )}

        {order.payment_proof_url && order.payment_status === "waiting_confirmation" && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-lg mb-1">
                  Menunggu Konfirmasi Admin
                </h3>
                <p className="text-blue-700 text-sm">
                  Bukti pembayaran Anda sudah diupload. Admin akan segera memverifikasi pembayaran Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Rejected - Show rejection reason */}
        {order.status !== "cancelled" && (order as any).payment_status === "rejected" && (order as any).payment_rejection_reason && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-lg mb-1">
                  Pembayaran Ditolak
                </h3>
                <p className="text-red-700 text-sm mb-2">
                  Bukti pembayaran Anda ditolak oleh admin dengan alasan:
                </p>
                <div className="bg-white border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 font-medium">{(order as any).payment_rejection_reason}</p>
                </div>
                <p className="text-red-600 text-xs mt-2">
                  Silakan upload ulang bukti pembayaran yang benar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Cancelled / Rejected */}
        {order.status === "cancelled" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 text-lg mb-1">
                  Pesanan Dibatalkan
                </h3>
                <p className="text-red-700 text-sm mb-2">
                  Mohon maaf, pesanan Anda tidak dapat dilanjutkan dengan alasan:
                </p>
                <div className="bg-white border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-800 font-medium">{(order as any).payment_rejection_reason || "Driver tidak tersedia atau kedai sedang tutup/antre panjang."}</p>
                </div>
                <button
                  onClick={() => navigate("/home")}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Payment Card */}
        {order.status !== "cancelled" && order.payment_status !== "awaiting_admin_confirmation" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
            {/* Payment Method Header */}
            {providerInfo && (
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{providerInfo.icon}</span>
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Transfer via</p>
                    <p className="text-white text-xl font-bold">
                      {providerInfo.label}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="p-6 space-y-5">
              {/* Account Number */}
              {currentPaymentAccount && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nomor Rekening / Nomor
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={currentPaymentAccount.account_number}
                        readOnly
                        className="flex-1 px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-900 text-lg tracking-wide"
                      />
                      <button
                        onClick={() =>
                          handleCopy(
                            currentPaymentAccount.account_number.replace(/-/g, ""),
                            "accountNumber"
                          )
                        }
                        className="px-5 py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg flex-shrink-0"
                      >
                        {copiedField === "accountNumber" ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Atas Nama
                    </label>
                    <input
                      type="text"
                      value={currentPaymentAccount.account_name}
                      readOnly
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-semibold text-gray-900"
                    />
                  </div>

                  {/* Unique Code Notice */}
                  {order.unique_payment_code && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-orange-900 mb-1">
                            Sertakan 3 digit kode unik ini di transfer Anda
                          </p>
                          <p className="text-xs text-orange-700">
                            Kode unik: <span className="font-bold text-lg">{order.unique_payment_code}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Payment - EMPHASIZED */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-lg">
                    <label className="block text-orange-100 text-sm font-semibold mb-2">
                      Total Transfer
                    </label>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-white text-4xl font-bold tracking-tight">
                        {formatCurrency(order.final_payment_amount || order.total)}
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            (order.final_payment_amount || order.total).toString(),
                            "amount"
                          )
                        }
                        className="px-4 py-3 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition-colors flex-shrink-0"
                      >
                        {copiedField === "amount" ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {order.unique_payment_code && (
                      <p className="text-orange-100 text-xs">
                        Sudah termasuk kode unik +{order.unique_payment_code}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Instructions */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-yellow-900 mb-2">
                      Instruksi Penting:
                    </p>
                    <ul className="text-sm text-yellow-800 space-y-1.5 list-none">
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600 font-bold">•</span>
                        <span><strong>Transfer sesuai nominal yang tertera</strong> (termasuk 3 digit unik)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600 font-bold">•</span>
                        <span><strong>Pastikan nominal tidak dibulatkan</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600 font-bold">•</span>
                        <span>Upload bukti transfer setelah pembayaran</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Card */}
        {order.payment_status !== "awaiting_admin_confirmation" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              Konfirmasi Pembayaran
            </h3>

            {/* Upload Section */}
            <div className="mb-5">
              {uploadedImage || order.payment_proof_url ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={uploadedImage || order.payment_proof_url || ""}
                      alt="Payment proof"
                      className="w-full h-72 object-contain bg-gray-50"
                    />
                    {!order.payment_proof_url && (
                      <button
                        onClick={() => {
                          setUploadedImage(null);
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {order.payment_proof_url && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Check className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-bold text-green-900">Bukti sudah diupload</p>
                          {order.payment_status === "waiting_confirmation" && (
                            <p className="text-sm text-green-700">
                              Menunggu konfirmasi admin
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : previewImage ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border-2 border-orange-200">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-72 object-contain bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        setPreviewImage(null);
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleUploadProof}
                    disabled={isUploading}
                    className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Mengupload...
                      </>
                    ) : (
                      "✓ Kirim Bukti"
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-3 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                  >
                    <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    <div className="text-base font-semibold text-gray-700 group-hover:text-orange-600">
                      Upload Bukti Pembayaran
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      JPG atau PNG (Max 5MB)
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* WhatsApp Button */}
            <button
              onClick={handleWhatsApp}
              className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl mb-3"
            >
              <MessageCircle className="w-6 h-6" />
              Kirim Bukti via WhatsApp
            </button>

            {/* Continue to Tracking */}
            {(uploadedImage || order.payment_proof_url) && (
              <button
                onClick={handleContinueToTracking}
                className="w-full py-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold text-lg shadow-lg hover:shadow-xl"
              >
                Lanjut ke Tracking Pesanan
              </button>
            )}
          </div>
        )}

        {/* Info Card */}
        {order.payment_status !== "awaiting_admin_confirmation" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Order akan diproses setelah:</p>
                <p>✓ Admin mengkonfirmasi pembayaran Anda</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
