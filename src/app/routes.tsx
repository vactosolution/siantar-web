import { createHashRouter, Navigate, Outlet, useLocation } from "react-router";
import { CustomerLayout } from "./layouts/CustomerLayout";
import { Home } from "./pages/customer/Home";
import { StoreDetail } from "./pages/customer/StoreDetail";
import { Cart } from "./pages/customer/Cart";
import { Checkout } from "./pages/customer/Checkout";
import { PaymentInstruction } from "./pages/customer/PaymentInstruction";
import { OrderTracking } from "./pages/customer/OrderTracking";
import { AdminPanel } from "./pages/admin/AdminPanel";
import { OutletMenuManagement } from "./pages/admin/OutletMenuManagement";
import { Settings } from "./pages/admin/Settings";
import { DriverPanel } from "./pages/driver/DriverPanel";
import { History } from "./pages/customer/History";
import { Splash } from "./pages/auth/Splash";
import { LoginCustomer } from "./pages/auth/LoginCustomer";
import { LoginAdmin } from "./pages/auth/LoginAdmin";
import { LoginDriver } from "./pages/auth/LoginDriver";
import { ServiceSelection } from "./pages/customer/ServiceSelection";
import { KirimBarang } from "./pages/customer/KirimBarang";
import { ServiceClosed } from "./pages/customer/ServiceClosed";
import { DataProvider, useData } from "./contexts/DataContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

function ServiceStatusWrapper() {
  const { appSettings } = useData();
  const { pathname } = useLocation();

  // Check if it's a customer route (starts with /home, /service-selection, or is /)
  const isCustomerRoute = 
    pathname.includes('/home') || 
    pathname.includes('/service-selection') || 
    pathname === '/' || 
    pathname.includes('/login-customer');

  if (appSettings.is_service_open === false && isCustomerRoute && !pathname.includes('/closed')) {
    return <Navigate to="/closed" replace />;
  }

  return <Outlet />;
}

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

export const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <ServiceStatusWrapper />,
        children: [
          { path: "/", element: <Splash /> },
          { path: "/service-selection", element: <ServiceSelection /> },
          { path: "/login-customer", element: <LoginCustomer /> },
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
        ],
      },
      { path: "/closed", element: <ServiceClosed /> },
      { path: "/login-admin", element: <LoginAdmin /> },
      { path: "/login-driver", element: <LoginDriver /> },
      { path: "/admin", element: <AdminPanel /> },
      { path: "/admin/outlet/:outletId/menu", element: <OutletMenuManagement /> },
      { path: "/admin/settings", element: <Settings /> },
      { path: "/driver", element: <DriverPanel /> },
    ],
  },
]);
