import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Persist session in localStorage
function saveSession(token: string, user: AuthUser) {
  try {
    localStorage.setItem("rr_token", token);
    localStorage.setItem("rr_user", JSON.stringify(user));
  } catch {}
}

function loadSession(): { token: string; user: AuthUser } | null {
  try {
    const token = localStorage.getItem("rr_token");
    const userStr = localStorage.getItem("rr_user");
    if (token && userStr) return { token, user: JSON.parse(userStr) };
  } catch {}
  return null;
}

function clearSession() {
  try {
    localStorage.removeItem("rr_token");
    localStorage.removeItem("rr_user");
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = loadSession();
  const [user, setUser] = useState<AuthUser | null>(saved?.user ?? null);
  const [token, setToken] = useState<string | null>(saved?.token ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useCallback((t: string, u: AuthUser) => {
    setToken(t);
    setUser(u);
    saveSession(t, u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setAuth(data.token, data.user);
  }, [setAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setAuth(data.token, data.user);
  }, [setAuth]);

  const logout = useCallback(() => {
    if (token) {
      apiRequest("POST", "/api/auth/logout", undefined, token).catch(() => {});
    }
    setToken(null);
    setUser(null);
    clearSession();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Helper for authenticated requests
export function useAuthFetch() {
  const { token } = useAuth();
  return useCallback((url: string) => {
    return fetch(url.startsWith("http") ? url : `${(window as any).__API_BASE || ""}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    });
  }, [token]);
}
