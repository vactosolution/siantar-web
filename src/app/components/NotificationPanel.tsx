import { Bell, X, CheckCheck } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface NotificationPanelProps {
  variant?: "admin" | "driver" | "customer";
}

export function NotificationPanel({ variant = "admin" }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotification();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return "🛒";
      case "payment_confirmed":
        return "💰";
      case "order_completed":
        return "✅";
      case "driver_assigned":
        return "🚚";
      case "order_status_changed":
        return "📦";
      default:
        return "🔔";
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-[#FF6A00] hover:bg-[#FF6A00]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-white p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-gray-900">Notifikasi</SheetTitle>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Semua notifikasi sudah dibaca"}
              </p>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#FF6A00] hover:text-[#FF6A00]/80 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Tandai semua
                  </button>
                )}
                <button
                  onClick={clearNotifications}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hapus semua
                </button>
              </div>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Bell className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? "bg-orange-50/50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            !notification.read ? "font-semibold text-gray-900" : "text-gray-700"
                          }`}
                        >
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-[#FF6A00] rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: localeId,
                        })}
                      </p>
                      {notification.orderId && (
                        <p className="text-xs text-gray-400 mt-1">Order #{notification.orderId.slice(0, 8)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
