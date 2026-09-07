import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// The master passcode for store administration
export const MASTER_ADMIN_PASSCODE = "emmy2026";
const ADMIN_STORAGE_KEY = "emmy_admin_authenticated";

type AuthValue = {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  email: string | null;
  adminLogin: (passcode: string) => boolean;
  adminLogout: () => void;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if store owner is logged in via Master Admin Passcode
    const localAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (localAdmin === "true") {
      setIsAdmin(true);
    }

    // Optional Supabase background listener
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (localStorage.getItem(ADMIN_STORAGE_KEY) === "true") {
        setIsAdmin(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const adminLogin = (passcode: string): boolean => {
    if (passcode.trim() === MASTER_ADMIN_PASSCODE) {
      localStorage.setItem(ADMIN_STORAGE_KEY, "true");
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setIsAdmin(false);
    supabase.auth.signOut().catch(() => {});
  };

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      isAdmin,
      email: isAdmin ? "store-owner@emmyking.com" : session?.user.email ?? null,
      adminLogin,
      adminLogout,
      refreshRole: async () => {},
    }),
    [session, loading, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export async function signOut() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  await supabase.auth.signOut().catch(() => {});
}

export async function grantAdminByEmail(_email: string): Promise<boolean> {
  return true;
}

