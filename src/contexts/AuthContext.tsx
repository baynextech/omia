import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch } from "../lib/api";
import { syncFavorites, clearFavorites } from "../hooks/useFavorites";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: "alumno" | "profesor" | "instituto" | "admin";
  teacherId?: string | null;
  plan?: string;
  isPremium?: boolean;
  created_at: string;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string, role?: string) => Promise<{ error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("omia_token"));

  // Mientras hay sesión guardada y todavía no llegó el perfil, las pantallas esperan.
  const [isLoading, setIsLoading] = useState<boolean>(() => !!localStorage.getItem("omia_token"));

  useEffect(() => {
    if (token) refreshProfile().finally(() => setIsLoading(false));
  }, []);

  const startSession = (data: any) => {
    const t = data.token || data.session?.access_token;
    if (!t) return false;
    localStorage.setItem("omia_token", t);
    setToken(t);
    setUser(data.user);
    setProfile(data.profile || data.user);
    syncFavorites();
    return true;
  };

  const refreshProfile = async () => {
    const t = localStorage.getItem("omia_token");
    if (!t) return;
    try {
      const res = await apiFetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setProfile(data.profile || data.user);
        syncFavorites();
      } else if (res.status === 401) {
        logout();
      }
    } catch {}
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Error al iniciar sesión" };
      if (!startSession(data)) return { error: "No se pudo iniciar la sesión" };
      return {};
    } catch {
      return { error: "Error de conexión" };
    }
  };

  const register = async (email: string, password: string, name: string, role = "alumno") => {
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role })
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Error al registrarse" };
      if (!startSession(data)) return { error: "No se pudo crear la sesión" };
      return {};
    } catch {
      return { error: "Error de conexión" };
    }
  };

  const logout = () => {
    localStorage.removeItem("omia_token");
    setToken(null);
    setUser(null);
    setProfile(null);
    clearFavorites();
  };

  return (
    <AuthContext.Provider value={{
      user, profile, token,
      login, register, logout,
      isAuthenticated: !!user,
      isLoading,
      isAdmin: profile?.role === "admin",
      isTeacher: profile?.role === "profesor" || profile?.role === "instituto" || profile?.role === "admin",
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
