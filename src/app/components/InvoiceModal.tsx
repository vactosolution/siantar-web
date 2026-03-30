import { useRef, useState } from "react";
import { X, Printer, Download, Image as ImageIcon } from "lucide-react";
import { Order } from "../contexts/DataContext";
import { formatCurrency } from "../utils/financeCalculations";
import html2canvas from "html2canvas";
import logoImage from "figma:asset/5522bec198d2c607245bbb83c121601db5647d0a.png";

interface InvoiceModalProps {
  order: Order;
  type: "customer" | "outlet";
  onClose: () => void;
}

export function InvoiceModal({ order, type, onClose }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [receiptWidth, setReceiptWidth] = useState<"58mm" | "80mm">("80mm");

  // Pixel width for receipt sizes (at 96 DPI)
  const widthInPixels = receiptWidth === "58mm" ? 220 : 302;

  const handlePrint = async () => {
    if (!invoiceRef.current) return;
    
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL("image/png");
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - ${order.id}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 100vh;
                background: #fff;
                padding: 10px;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              @media print {
                @page {
                  size: ${receiptWidth};
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                img {
                  width: 100%;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" alt="Invoice" />
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error("Error generating print image:", error);
      alert("Gagal membuat preview print. Silakan coba lagi.");
    }
  };

  const handleDownloadImage = async (format: "png" | "jpg" = "png") => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const imgData = canvas.toDataURL(mimeType, 0.92);
      
      const link = document.createElement("a");
      link.download = `Receipt_${type}_${order.id}_${Date.now()}.${format}`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Gagal membuat gambar. Silakan coba lagi.");
    }
  };

  const invoiceDate = new Date(order.timestamp).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const invoiceTime = new Date(order.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Dashed line divider
  const dashedLine = "- ".repeat(30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-gray-100 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex flex-col gap-3 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {type === "customer" ? "Receipt Pelanggan" : "Receipt Outlet"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Ukuran:</span>
            <button
              onClick={() => setReceiptWidth("58mm")}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                receiptWidth === "58mm"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              58mm
            </button>
            <button
              onClick={() => setReceiptWidth("80mm")}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                receiptWidth === "80mm"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              80mm
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={() => handleDownloadImage("png")}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>PNG</span>
            </button>
            <button
              onClick={() => handleDownloadImage("jpg")}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              <span>JPG</span>
            </button>
          </div>
        </div>

        {/* Receipt Preview Container */}
        <div className="p-4 flex justify-center">
          {/* Thermal Receipt */}
          <div
            ref={invoiceRef}
            style={{
              width: `${widthInPixels}px`,
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'Courier New, monospace',
              fontSize: '11px',
              lineHeight: '1.4',
              padding: '16px 8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header - Logo & Store Name */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <img src={logoImage} alt="Logo" style={{ width: '50px', height: '50px', marginBottom: '4px' }} />
              <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>
                SIANTER
              </div>
              <div style={{ fontSize: '9px', marginTop: '4px' }}>
                Delivery Service
              </div>
              <div style={{ fontSize: '9px' }}>
                Kec. Balai Riam
              </div>
            </div>

            {/* Divider */}
            <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              {dashedLine}
            </div>

            {/* Outlet Name */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
              {order.outlet.name}
            </div>
            <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '12px' }}>
              {order.outlet.village}
            </div>

            {/* Order Info */}
            <div style={{ marginBottom: '12px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Order ID:</span>
                <span style={{ fontWeight: 'bold' }}>#{order.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Tanggal:</span>
                <span>{invoiceDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Waktu:</span>
                <span>{invoiceTime}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              {dashedLine}
            </div>

            {/* Customer Info (only for customer invoice) */}
            {type === "customer" && (
              <>
                <div style={{ marginBottom: '8px', fontSize: '10px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PELANGGAN:</div>
                  <div>{order.customerName}</div>
                  <div>{order.customerPhone}</div>
                  <div style={{ fontSize: '9px' }}>{order.customerVillage}</div>
                  <div style={{ fontSize: '9px' }}>{order.address}</div>
                </div>

                {/* Divider */}
                <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                  {dashedLine}
                </div>
              </>
            )}

            {/* Items List */}
            <div style={{ marginBottom: '8px' }}>
              {order.items.map((item, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
                    {item.name}
                  </div>
                  {item.selectedSize && (
                    <div style={{ fontSize: '9px', marginLeft: '4px' }}>
                      Size: {item.selectedSize}
                    </div>
                  )}
                  {item.selectedExtras && item.selectedExtras.length > 0 && (
                    <div style={{ fontSize: '9px', marginLeft: '4px' }}>
                      Extra: {item.selectedExtras.join(", ")}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                    <span>  {item.quantity} x {formatCurrency(item.price)}</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              {dashedLine}
            </div>

            {/* Totals */}
            <div style={{ marginBottom: '8px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>

              {type === "customer" && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Service Fee:</span>
                    <span>{formatCurrency(order.serviceFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Delivery ({order.distance}km):</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                  {order.isMinimumChargeApplied && (
                    <div style={{ fontSize: '8px', fontStyle: 'italic', marginBottom: '4px', textAlign: 'right' }}>
                      *Min. 1km charge
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px solid #000', marginBottom: '8px' }}></div>

            {/* Grand Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>
              <span>TOTAL:</span>
              <span>
                {type === "customer"
                  ? formatCurrency(order.total)
                  : formatCurrency(order.subtotal)}
              </span>
            </div>

            {/* Transfer info for customer */}
            {type === "customer" && order.paymentMethod === "transfer" && order.uniquePaymentCode && (
              <>
                <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                  {dashedLine}
                </div>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                    Transfer ke:
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {formatCurrency(order.finalPaymentAmount || order.total)}
                  </div>
                  <div style={{ fontSize: '8px', marginTop: '2px' }}>
                    (termasuk kode unik)
                  </div>
                </div>
              </>
            )}

            {/* Payment Method */}
            <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '12px' }}>
              <div>
                Metode: {order.paymentMethod === "cod" ? "Cash on Delivery" : `Transfer ${order.paymentProvider || ""}`}
              </div>
              {order.paymentMethod === "transfer" && order.paymentStatus && (
                <div style={{ marginTop: '2px', fontSize: '9px' }}>
                  Status: {
                    order.paymentStatus === "confirmed" ? "✓ Terkonfirmasi" :
                    order.paymentStatus === "waiting_confirmation" ? "⏳ Menunggu Konfirmasi" :
                    order.paymentStatus === "rejected" ? "✗ Ditolak" :
                    "⏳ Menunggu Pembayaran"
                  }
                </div>
              )}
              {order.driverName && (
                <div style={{ marginTop: '4px' }}>
                  Driver: {order.driverName}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              {dashedLine}
            </div>

            {/* Footer Notes */}
            <div style={{ fontSize: '9px', textAlign: 'center', marginBottom: '8px' }}>
              {type === "customer" ? (
                <>
                  <div>Terima kasih atas pesanannya!</div>
                  <div style={{ marginTop: '4px' }}>Semoga hari Anda menyenangkan</div>
                </>
              ) : (
                <>
                  <div>INVOICE OUTLET</div>
                  <div style={{ marginTop: '4px' }}>Total: {formatCurrency(order.subtotal)}</div>
                  <div style={{ fontSize: '8px', marginTop: '4px' }}>
                    *Tidak termasuk biaya delivery
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              {dashedLine}
            </div>

            {/* Footer */}
            <div style={{ fontSize: '8px', textAlign: 'center' }}>
              <div>Dokumen elektronik SiAnter</div>
              <div style={{ marginTop: '4px' }}>
                {new Date().toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}