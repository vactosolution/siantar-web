import { useRef, useState, useEffect } from "react";
import { X, Printer, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { Order, type OrderItemWithProduct } from "../contexts/DataContext";
import { useData } from "../contexts/DataContext";
import { formatCurrency } from "../utils/financeCalculations";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface InvoiceModalProps {
  order: Order;
  type: "customer" | "outlet";
  onClose: () => void;
}

export function InvoiceModal({ order, type, onClose }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [receiptWidth, setReceiptWidth] = useState<"58mm" | "80mm">("80mm");
  const { fetchOrderItems } = useData();
  const [orderItems, setOrderItems] = useState<OrderItemWithProduct[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Fetch order items on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingItems(true);
      const items = await fetchOrderItems(order.id);
      if (!cancelled) {
        setOrderItems(items);
        setLoadingItems(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [order.id, fetchOrderItems]);

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
      toast.error("Gagal membuat preview print. Silakan coba lagi.");
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
      toast.error("Gagal membuat gambar. Silakan coba lagi.");
    }
  };

  const invoiceDate = new Date(order.created_at).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const invoiceTime = new Date(order.created_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Dashed line divider
  const dashedLine = "- ".repeat(30);

  const markup = order.service_fee || 0;
  const legacyAdminFee = order.admin_fee || 0;
  const storeSubtotal = order.subtotal - markup;
  const storeGrandTotal = storeSubtotal - legacyAdminFee;

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
            {/* Header - Store Name */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
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
              {order.outlet_name}
            </div>

            {/* Order Info */}
            <div style={{ marginBottom: '12px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Order ID:</span>
                <span style={{ fontWeight: 'bold' }}>#{order.id.slice(0, 8)}</span>
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
                  <div>{order.customer_name}</div>
                  <div>{order.customer_phone}</div>
                  <div style={{ fontSize: '9px' }}>{order.customer_village}</div>
                  <div style={{ fontSize: '9px' }}>{order.address}</div>
                </div>

                {/* Divider */}
                <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                  {dashedLine}
                </div>
              </>
            )}

            {/* Items List - display actual order items */}
            <div style={{ marginBottom: '8px' }}>
              {loadingItems ? (
                <div style={{ textAlign: 'center', fontSize: '9px', padding: '8px 0' }}>Memuat item...</div>
              ) : orderItems.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '6px' }}>PESANAN:</div>
                  {orderItems.map((item, idx) => (
                    <div key={item.id || idx} style={{ marginBottom: '6px', fontSize: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ flex: 1, wordBreak: 'break-word' }}>{item.name}</span>
                      </div>
                      {item.selected_variant && (
                        <div style={{ fontSize: '8px', color: '#666', paddingLeft: '4px' }}>
                          Varian: {item.selected_variant}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                        <span style={{ paddingLeft: '4px' }}>
                          {formatCurrency(item.price)} x{item.quantity}
                        </span>
                        <span style={{ fontWeight: 'bold' }}>
                          {formatCurrency(item.item_total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Items subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #ccc' }}>
                    <span>Subtotal ({orderItems.reduce((s, i) => s + i.quantity, 0)} item):</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {type === "customer" ? formatCurrency(order.subtotal) : formatCurrency(storeSubtotal)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                    <span>Subtotal (items):</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {type === "customer" ? formatCurrency(order.subtotal) : formatCurrency(storeSubtotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
              {dashedLine}
            </div>

            {/* Totals */}
            <div style={{ marginBottom: '8px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <span>{type === "customer" ? formatCurrency(order.subtotal) : formatCurrency(storeSubtotal)}</span>
              </div>

              {type === "customer" && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Delivery ({order.distance}km):</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                </>
              )}

              {type === "outlet" && legacyAdminFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Admin Fee:</span>
                  <span>-{formatCurrency(legacyAdminFee)}</span>
                </div>
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
                  : formatCurrency(storeGrandTotal)}
              </span>
            </div>

            {/* Transfer info for customer */}
            {type === "customer" && order.payment_method === "transfer" && order.unique_payment_code && (
              <>
                <div style={{ fontSize: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                  {dashedLine}
                </div>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                    Transfer ke:
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {formatCurrency(order.final_payment_amount || order.total)}
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
                Metode: {order.payment_method === "cod" ? "Cash on Delivery" : `Transfer ${order.payment_provider || ""}`}
              </div>
              {order.payment_method === "transfer" && order.payment_status && (
                <div style={{ marginTop: '2px', fontSize: '9px' }}>
                  Status: {
                    order.payment_status === "confirmed" ? "✓ Terkonfirmasi" :
                    order.payment_status === "waiting_confirmation" ? "⏳ Menunggu Konfirmasi" :
                    order.payment_status === "rejected" ? "✗ Ditolak" :
                    "⏳ Menunggu Pembayaran"
                  }
                </div>
              )}
              {order.driver_name && (
                <div style={{ marginTop: '4px' }}>
                  Driver: {order.driver_name}
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
                  <div style={{ marginTop: '4px' }}>Total: {formatCurrency(storeGrandTotal)}</div>
                  {legacyAdminFee > 0 && (
                    <div style={{ fontSize: '8px', marginTop: '4px' }}>
                      *Setelah dipotong biaya admin
                    </div>
                  )}
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
