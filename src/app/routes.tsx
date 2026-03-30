import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { CustomerLayout } from "./layouts/CustomerLayout";
import { Home } from "./pages/customer/Home";
import { StoreDetail } from "./pages/customer/StoreDetail";
import { Cart } from "./pages/customer/Cart";
import { Checkout } from "./pages/customer/Checkout";
import { PaymentInstruction } from "./pages/customer/PaymentInstruction";
import { OrderTracking } from "./pages/customer/OrderTracking";
import { AdminPanel } from "./pages/admin/AdminPanel";
import { OutletMenuManagement } from "./pages/admin/OutletMenuManagement";
import { DriverPanel } from "./pages/driver/DriverPanel";
import { History } from "./pages/customer/History";
import { Splash } from "./pages/auth/Splash";
import { LoginCustomer } from "./pages/auth/LoginCustomer";
import { LoginAdmin } from "./pages/auth/LoginAdmin";
import { LoginDriver } from "./pages/auth/LoginDriver";
import { ServiceSelection } from "./pages/customer/ServiceSelection";
import { KirimBarang } from "./pages/customer/KirimBarang";
import { DataProvider } from "./contexts/DataContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

// Root layout with all providers
function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <CartProvider>
          <NotificationProvider>
            <Outlet />
          </NotificationProvider>
        </CartProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Splash />,
      },
      {
        path: "/service-selection",
        element: <ServiceSelection />,
      },
      {
        path: "/login-customer",
        element: <LoginCustomer />,
      },
      {
        path: "/login-admin",
        element: <LoginAdmin />,
      },
      {
        path: "/login-driver",
        element: <LoginDriver />,
      },
      {
        path: "/home",
        element: <CustomerLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: "store/:storeId", element: <StoreDetail /> },
          { path: "cart", element: <Cart /> },
          { path: "checkout", element: <Checkout /> },
          { path: "payment/:orderId", element: <PaymentInstruction /> },
          { path: "tracking/:orderId", element: <OrderTracking /> },
          { path: "history", element: <History /> },
          { path: "kirim-barang", element: <KirimBarang /> },
        ],
      },
      {
        path: "/admin",
        element: <AdminPanel />,
      },
      {
        path: "/admin/outlet/:outletId/menu",
        element: <OutletMenuManagement />,
      },
      {
        path: "/driver",
        element: <DriverPanel />,
      },
    ],
  },
]);