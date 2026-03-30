import { Link, useLocation, useNavigate } from "react-router";
import { ShoppingCart, User, LogOut } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "./Logo";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useData } from "../contexts/DataContext";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCart();
  const { isAuthenticated, logout, username } = useAuth();
  const { orders } = useData();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Check if customer has active order
  const hasActiveOrder = orders.some(
    (order) =>
      order.customerName === username &&
      order.status !== "completed"
  );

  const handleLogout = () => {
    // Check for active order
    if (hasActiveOrder) {
      // Show special warning for active orders
      if (window.confirm("Pesanan kamu masih berjalan, yakin ingin keluar?")) {
        logout();
        navigate("/login-customer");
      }
    } else {
      // Show regular logout confirmation
      setShowLogoutConfirm(true);
    }
  };

  const confirmLogout = () => {
    logout();
    navigate("/login-customer");
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/home" className="flex items-center">
            <Logo size="md" />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/home"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/home" ? "text-[#FF6A00]" : "text-gray-700 hover:text-[#FF6A00]"
              }`}
            >
              Home
            </Link>
            <Link
              to="/home/cart"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/home/cart" ? "text-[#FF6A00]" : "text-gray-700 hover:text-[#FF6A00]"
              }`}
            >
              Order
            </Link>
            <Link
              to="/home/history"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/home/history" ? "text-[#FF6A00]" : "text-gray-700 hover:text-[#FF6A00]"
              }`}
            >
              History
            </Link>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            {/* Cart button - mobile */}
            <Link
              to="/home/cart"
              className="md:hidden relative p-2 text-gray-700 hover:text-[#FF6A00] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6A00] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Auth buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {username}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login-admin"
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
                <Link
                  to="/login-driver"
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#FF6A00] text-white rounded-lg hover:bg-[#FF8534] transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Driver</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around items-center">
          <Link
            to="/home"
            className={`flex flex-col items-center gap-1 py-2 px-4 ${
              location.pathname === "/home" ? "text-[#FF6A00]" : "text-gray-600"
            }`}
          >
            <div className="text-xs font-medium">Home</div>
          </Link>
          <Link
            to="/home/cart"
            className={`flex flex-col items-center gap-1 py-2 px-4 relative ${
              location.pathname === "/home/cart" ? "text-[#FF6A00]" : "text-gray-600"
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-2 bg-[#FF6A00] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
            <div className="text-xs font-medium">Order</div>
          </Link>
          <Link
            to="/home/history"
            className={`flex flex-col items-center gap-1 py-2 px-4 ${
              location.pathname === "/home/history" ? "text-[#FF6A00]" : "text-gray-600"
            }`}
          >
            <div className="text-xs font-medium">History</div>
          </Link>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Apakah kamu yakin ingin keluar?"
        description="Anda akan keluar dari akun dan kembali ke halaman login."
        confirmText="Ya, Logout"
        cancelText="Batal"
        onConfirm={confirmLogout}
        variant="default"
      />
    </nav>
  );
}