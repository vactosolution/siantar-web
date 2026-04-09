import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import type { Tables } from "../../lib/database.types";

type Profile = Tables<"profiles">;
type UserRole = "customer" | "admin" | "driver" | null;

interface AuthContextType {
  role: UserRole;
  isAuthenticated: boolean;
  loading: boolean;
  profile: Profile | null;
  login: (role: UserRole, username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  username: string;
  customerPhone: string; // For customer session identification
  driverId: string | null;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [driverId, setDriverId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // First, check for customer session in localStorage
      const customerName = localStorage.getItem("sianter_customer_name");
      const customerPhone = localStorage.getItem("sianter_customer_phone");
      if (customerName && customerPhone) {
        setRole("customer");
        setUsername(customerName);
        setCustomerPhone(customerPhone);
        setLoading(false);
        return;
      }

      // Then check Supabase session (for admin/driver)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setRole(profileData.role as UserRole);
          setUsername(profileData.name);
          if (profileData.role === "driver") {
            setDriverId(profileData.id);
          }
          setSessionId(session.access_token);
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore TOKEN_REFRESHED and SIGNED_IN - checkSession handles initial load, login() handles new logins
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") return;

      if (event === "SIGNED_OUT") {
        // Prevent clearing states if it's a customer accessing via localStorage.
        const activeCustomerName = localStorage.getItem("sianter_customer_name");
        if (activeCustomerName) {
          return;
        }
        setRole(null);
        setUsername("");
        setDriverId(null);
        setSessionId(null);
        setProfile(null);
        return;
      }

      // Handle other events (USER_UPDATED, PASSWORD_RECOVERY, etc.)
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setRole(profileData.role as UserRole);
          setUsername(profileData.name);
          if (profileData.role === "driver") {
            setDriverId(profileData.id);
          }
          setSessionId(session.access_token);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (userRole: UserRole, inputUsername: string, inputPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!userRole) return { success: false, message: "Role tidak valid" };

    // Customer login - no real auth, just name and phone
    if (userRole === "customer") {
      if (inputUsername && inputPassword) {
        // Clear any Supabase session to prevent conflicts
        await supabase.auth.signOut();
        setRole("customer");
        setUsername(inputUsername);
        setCustomerPhone(inputPassword);
        // Store customer info in localStorage for session
        localStorage.setItem("sianter_customer_name", inputUsername);
        localStorage.setItem("sianter_customer_phone", inputPassword);
        return { success: true };
      }
      return { success: false, message: "Nama dan nomor HP wajib diisi" };
    }

    // Admin and Driver login via Supabase Auth
    try {
      // Clear any lingering customer session from localStorage
      localStorage.removeItem("sianter_customer_name");
      localStorage.removeItem("sianter_customer_phone");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: inputUsername,
        password: inputPassword,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileData) {
          if (profileData.role !== userRole) {
            await supabase.auth.signOut();
            return { success: false, message: "Akun tidak memiliki akses role tersebut" };
          }
          if (!profileData.is_active) {
            await supabase.auth.signOut();
            return { success: false, message: "Akun dinonaktifkan" };
          }

          setProfile(profileData);
          setRole(profileData.role as UserRole);
          setUsername(profileData.name);
          if (profileData.role === "driver") {
            setDriverId(profileData.id);
            setSessionId(data.session?.access_token || null);
          }
          return { success: true };
        }
      }

      return { success: false, message: "Profile tidak ditemukan" };
    } catch {
      return { success: false, message: "Terjadi kesalahan saat login" };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUsername("");
    setCustomerPhone("");
    setDriverId(null);
    setSessionId(null);
    setProfile(null);
    localStorage.removeItem("sianter_customer_name");
    localStorage.removeItem("sianter_customer_phone");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        role,
        isAuthenticated: role !== null,
        loading,
        profile,
        login,
        logout,
        username,
        customerPhone,
        driverId,
        sessionId,
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
