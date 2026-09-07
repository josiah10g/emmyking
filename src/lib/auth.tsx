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
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const verifyRole = async (s: Session | null) => {
    if (!s?.user?.id) {
      setIsAdmin(false);
      return;
    }
    const admin = await checkIsAdmin(s.user.id);
    setIsAdmin(admin);
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      setSession(next);
      await verifyRole(next);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const s = data.session ?? null;
      setSession(s);
      await verifyRole(s);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      isAdmin,
      email: session?.user?.email ?? null,
      refreshRole: async () => {
        if (session?.user?.id) {
          const admin = await checkIsAdmin(session.user.id);
          setIsAdmin(admin);
        }
      },
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

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut().catch(() => {});
}

export async function grantAdminByEmail(_email: string): Promise<boolean> {
  return true;
}

