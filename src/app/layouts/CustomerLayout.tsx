import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

export function CustomerLayout() {
  const { role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || role !== "customer") {
      navigate("/login-customer");
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || role !== "customer") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Outlet />
    </div>
  );
}
