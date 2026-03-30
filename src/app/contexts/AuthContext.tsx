import { createContext, useContext, useState, ReactNode } from "react";

type UserRole = "customer" | "admin" | "driver" | null;

interface AuthContextType {
  role: UserRole;
  isAuthenticated: boolean;
  login: (role: UserRole, username: string, password: string) => { success: boolean; driverId?: string; sessionId?: string; message?: string };
  logout: () => void;
  username: string;
  driverId: string | null; // Store driver ID for logged in drivers
  sessionId: string | null; // Store current session ID
  setDriverAuth: (username: string, driverId: string, sessionId: string) => void; // For driver login
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock credentials for demo
const MOCK_CREDENTIALS = {
  customer: { username: "", password: "" }, // No auth needed for customer
  admin: { username: "admin", password: "admin123" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState("");
  const [driverId, setDriverId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const login = (userRole: UserRole, inputUsername: string, inputPassword: string): { success: boolean; driverId?: string; sessionId?: string; message?: string } => {
    if (!userRole) return { success: false };
    
    // Simple login for customer - just needs name and phone
    if (userRole === "customer") {
      if (inputUsername && inputPassword) {
        setRole(userRole);
        setUsername(inputUsername);
        return { success: true };
      }
      return { success: false };
    }
    
    // Admin login
    if (userRole === "admin") {
      const credentials = MOCK_CREDENTIALS[userRole];
      if (credentials.username === inputUsername && credentials.password === inputPassword) {
        setRole(userRole);
        setUsername(inputUsername);
        return { success: true };
      }
      return { success: false };
    }

    // Driver login is handled differently - will be validated against DataContext
    // This will be checked in the LoginDriver component
    return { success: false };
  };

  const logout = () => {
    setRole(null);
    setUsername("");
    setDriverId(null);
    setSessionId(null);
  };

  const setDriverAuth = (driverUsername: string, driverId: string, sessionId: string) => {
    setRole("driver");
    setUsername(driverUsername);
    setDriverId(driverId);
    setSessionId(sessionId);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        isAuthenticated: role !== null,
        login,
        logout,
        username,
        driverId,
        sessionId,
        setDriverAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}