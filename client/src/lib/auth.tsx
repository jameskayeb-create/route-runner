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

// In-memory token storage (no localStorage in sandboxed iframes)
let memoryToken: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useCallback((t: string, u: AuthUser) => {
    memoryToken = t;
    setToken(t);
    setUser(u);
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
    if (memoryToken) {
      apiRequest("POST", "/api/auth/logout", undefined, memoryToken).catch(() => {});
    }
    memoryToken = null;
    setToken(null);
    setUser(null);
  }, []);

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
