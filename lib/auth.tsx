"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";

interface User {
  id: string;
  email: string;
  username: string | null;
  email_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, username?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_ROUTES = ["/auth/login", "/auth/register", "/auth/verify-email", "/auth/verify-required", "/share"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user && !isPublicRoute) {
        router.replace("/auth/login");
      } else if (user && !user.email_verified && pathname !== "/auth/verify-required" && pathname !== "/auth/verify-email") {
        router.replace("/auth/verify-required");
      } else if (user && user.email_verified && isPublicRoute && pathname !== "/auth/verify-email" && !pathname.startsWith("/share")) {
        router.replace("/home");
      }
    }
  }, [user, isLoading, pathname]);

  async function checkAuth() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Not authenticated
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error };

    setUser(data.user);
    router.replace(data.user.email_verified ? "/home" : "/auth/verify-required");
    return {};
  }

  async function register(email: string, password: string, username?: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error };

    setUser(data.user);
    router.replace("/auth/verify-required");
    return {};
  }

  async function logout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    router.replace("/auth/login");
  }

  async function resendVerification() {
    const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return {};
  }

  // Show nothing while checking auth (prevents flash)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mood-onboarding">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-r-transparent" />
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!user && !isPublicRoute) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
