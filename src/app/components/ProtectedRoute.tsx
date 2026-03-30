import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: "customer" | "admin" | "driver";
  redirectTo: string;
}

export function ProtectedRoute({ children, requiredRole, redirectTo }: ProtectedRouteProps) {
  const { role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || role !== requiredRole) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, role, requiredRole, redirectTo, navigate]);

  if (!isAuthenticated || role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
