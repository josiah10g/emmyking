import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// The master passcode for store administration
export const MASTER_ADMIN_PASSCODE = "emmy2026";
const ADMIN_STORAGE_KEY = "emmy_admin_authenticated";

type AuthValue = {
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  email: string | null;
  /** User's full name from signup metadata, or email prefix as fallback */
  displayName: string | null;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function checkIsAdmin(userId: string): Promise<boolean> {
  // First check if user has admin role
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (data) return true;

  // If no user roles exist yet in the database, claim this user as the first admin automatically
  try {
    const { data: claimed } = await supabase.rpc("claim_first_admin");
    if (claimed) return true;
  } catch {
    // If rpc doesn't exist, proceed
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const verifyRole = async (s: Session | null) => {
    if (!s?.user?.id) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    try {
      const admin = await checkIsAdmin(s.user.id);
      setIsAdmin(admin);
    } finally {
      setRoleLoading(false);
    }
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

  const value = useMemo<AuthValue>(() => {
    const meta = session?.user?.user_metadata ?? {};
    const rawName: string =
      (meta["full_name"] as string | undefined) ??
      (meta["name"] as string | undefined) ??
      "";
    const displayName: string | null = rawName.trim()
      ? rawName.trim()
      : session?.user?.email
        ? session.user.email.split("@")[0]
        : null;

    return {
      session,
      loading,
      roleLoading,
      isAdmin,
      email: session?.user?.email ?? null,
      displayName,
      refreshRole: async () => {
        if (session?.user?.id) {
          const admin = await checkIsAdmin(session.user.id);
          setIsAdmin(admin);
        }
      },
    };
  }, [session, loading, roleLoading, isAdmin]);

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

export async function signUpWithPassword(email: string, password: string, fullName?: string, phone?: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName?.trim() || "",
        phone: phone?.trim() || "",
      },
    },
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

export async function grantAdminByEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  
  // Call the Supabase function grant_admin_by_email which looks up auth.users by email
  const { data, error } = await supabase.rpc("grant_admin_by_email", {
    _email: normalized,
  });

  if (error) throw error;
  return data === true;
}


