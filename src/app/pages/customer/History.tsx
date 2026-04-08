import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Clock, MapPin, CheckCircle2, Package, Loader2, ShoppingBag } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/financeCalculations";
import { OrderItemsDetail } from "../../components/OrderItemsDetail";
import { motion } from "motion/react";

export function History() {
  const { orders, loadingOrders } = useData();
  const { customerPhone } = useAuth();
  const navigate = useNavigate();
  const [showOrderItemsDetail, setShowOrderItemsDetail] = useState<{ orderId: string; outletName: string } | null>(null);

  const customerName = localStorage.getItem("sianter_customer_name") || "";

  // Wait for auth to load before filtering orders
  if (!customerPhone || !customerName) {
    return (
      <div className="pb-20 md:pb-8 min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  // Filter orders for this customer - MUST match BOTH name AND phone
  const customerOrders = orders.filter((order) => {
    return order.customer_name === customerName && order.customer_phone === customerPhone;
  });

  // Sort by most recent first
  const sortedOrders = [...customerOrders].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-600";
      case "pending":
        return "bg-yellow-50 text-yellow-600";
      default:
        return "bg-orange-50 text-orange-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Selesai";
      case "pending":
        return "Menunggu";
      case "processing":
        return "Diproses";
      case "going-to-store":
        return "Menuju Toko";
      case "picked-up":
        return "Diambil";
      case "on-delivery":
        return "Dikirim";
      default:
        return status;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loadingOrders) {
    return (
      <div className="pb-20 md:pb-8 min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Riwayat Pesanan
          </h1>
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Riwayat Pesanan
        </h1>

        {sortedOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">
              Belum ada riwayat pesanan
            </p>
            <Link
              to="/home"
              className="inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}
                      >
                        {order.status === "completed" && (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {order.outlet_name} → {order.customer_village}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Total</div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-600 mb-2">Ringkasan:</div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-900 flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-gray-600">
                        {formatCurrency(order.subtotal)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 flex justify-between">
                      <span>Biaya Kirim</span>
                      <span className="text-gray-600">
                        {formatCurrency(order.delivery_fee)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setShowOrderItemsDetail({ orderId: order.id, outletName: order.outlet_name })}
                    className="py-2 text-blue-600 font-medium border-2 border-blue-400 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Detail
                  </button>
                  <button
                    onClick={() => navigate(`/home/tracking/${order.id}`)}
                    className="py-2 text-orange-600 font-medium border-2 border-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    {order.status === "completed"
                      ? "Lacak"
                      : "Lacak"}
                  </button>
                  <button onClick={() => navigate(`/home/store/${order.outlet_id}`)} className="py-2 bg-orange-500 text-white font-medium hover:bg-orange-600 rounded-lg transition-colors">
                    Pesan Lagi
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Order Items Detail Modal */}
      {showOrderItemsDetail && (
        <OrderItemsDetail
          orderId={showOrderItemsDetail.orderId}
          outletName={showOrderItemsDetail.outletName}
          mode="modal"
          onClose={() => setShowOrderItemsDetail(null)}
        />
      )}
    </div>
  );
}
