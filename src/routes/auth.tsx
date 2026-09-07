import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EMMYKING STORES" },
      {
        name: "description",
        content: "Sign in or create an EMMYKING STORES account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session || isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [session, isAdmin, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
        toast.success("Welcome back! Entering dashboard...");
        navigate({ to: "/admin" });
      } else {
        const res = await signUpWithPassword(email, password);
        toast.success("Account created successfully!");
        
        // If session returned immediately (auto-confirm enabled), go straight to admin
        if (res?.session) {
          navigate({ to: "/admin" });
        } else {
          // Try to sign in right away
          try {
            await signInWithPassword(email, password);
            navigate({ to: "/admin" });
          } catch {
            toast.info("Account ready! You can now sign in.");
            setMode("login");
          }
        }
      }
    } catch (err: unknown) {
      console.error("[Auth Error]", err);
      const raw = err instanceof Error ? err.message : String(err ?? "");
      const lower = raw.toLowerCase();

      if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
        setError("Invalid email or password. Check your details, or switch to 'Sign up' below to create this account.");
      } else if (lower.includes("email not confirmed") || lower.includes("unconfirmed")) {
        setError("Email confirmation is enabled in Supabase. Check your inbox or turn off 'Confirm email' in Supabase Authentication settings.");
      } else if (lower.includes("user already registered") || lower.includes("already in use")) {
        setError("This email already has an account. Click 'Sign in' to log in.");
        setMode("login");
      } else if (lower.includes("weak") || lower.includes("easy to guess") || lower.includes("pwned")) {
        setError("Password rejected: Turn off 'Prevent use of leaked passwords' in your Supabase Auth settings to allow simple passwords, or use a stronger password.");
      } else if (lower.includes("network") || lower.includes("failed to fetch")) {
        setError("Network error: Cannot reach Supabase. Check your connection.");
      } else {
        setError(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="eyebrow text-muted-foreground">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in or create your store admin account using your email and password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <div className="relative mt-2">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@gmail.com"
              className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => signInWithGoogle().catch((e) => setError(String(e?.message ?? e)))}
        className="mt-3 w-full rounded-sm border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
        className="mt-6 w-full text-center text-sm text-muted-foreground underline"
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

