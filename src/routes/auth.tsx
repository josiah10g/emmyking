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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, loading, roleLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only automatically jump to /admin if the user is verified as an admin
    if (!loading && !roleLoading && session && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [session, loading, roleLoading, isAdmin, navigate]);

  if (loading || (session && roleLoading)) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">Accessing Store Control…</h2>
        <p className="mt-1 text-sm text-muted-foreground">Preparing your dashboard, please hold on.</p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "signup" && !firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
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
        toast.success("Welcome back! Loading dashboard...");
        navigate({ to: "/admin" });
      } else {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const res = await signUpWithPassword(email, password, fullName);
        toast.success("Account created successfully!");
        
        if (res?.session) {
          navigate({ to: "/admin" });
        } else {
          try {
            await signInWithPassword(email, password);
            navigate({ to: "/admin" });
          } catch {
            toast.info("Account ready! Please click Sign In to continue.");
            setMode("login");
          }
        }
      }
    } catch (err: unknown) {
      console.error("[Auth Error]", err);
      const raw = err instanceof Error ? err.message : String(err ?? "");
      const lower = raw.toLowerCase();

      if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
        setError("Invalid email or password. Please verify your details or create a new account.");
      } else if (lower.includes("email not confirmed") || lower.includes("unconfirmed")) {
        setError("Email confirmation is enabled in Supabase. Check your inbox or turn off 'Confirm sign up' under Authentication > Emails in Supabase.");
      } else if (lower.includes("user already registered") || lower.includes("already in use")) {
        setError("An account with this email already exists. Please switch to Sign In.");
        setMode("login");
      } else if (lower.includes("weak") || lower.includes("easy to guess") || lower.includes("pwned")) {
        setError("Password rejected as common. Please choose a different password.");
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
        <p className="eyebrow text-muted-foreground uppercase tracking-widest text-xs font-semibold">Store Portal</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Sign In" : "Create An Account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to manage products, orders, and payment settings."
            : "Create your store administrator account to get started."}
        </p>
      </div>

      {/* Prominent Tab Switch Buttons */}
      <div className="mt-8 flex rounded-md bg-muted p-1 border border-border/60">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-sm py-2.5 text-sm font-semibold transition-all ${
            mode === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 rounded-sm py-2.5 text-sm font-semibold transition-all ${
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Create An Account
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name
              </label>
              <div className="relative mt-1.5">
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Surname
              </label>
              <div className="relative mt-1.5">
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email address
          </label>
          <div className="relative mt-1.5">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@gmail.com"
              className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign In to Dashboard" : "Create Account & Enter"}
        </button>
      </form>

      <div className="relative my-6 text-center text-xs">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <span className="relative bg-background px-3 text-muted-foreground font-medium uppercase tracking-wider">
          Or
        </span>
      </div>

      <button
        type="button"
        onClick={() => signInWithGoogle().catch((e) => setError(String(e?.message ?? e)))}
        className="w-full rounded-sm border border-border bg-card px-6 py-2.5 text-sm font-semibold transition hover:bg-accent hover:text-accent-foreground"
      >
        Continue with Google
      </button>

      {/* Prominent Action Toggle Card below */}
      <div className="mt-8 rounded-lg border border-border/80 bg-accent/30 p-4 text-center">
        <p className="text-xs text-muted-foreground font-medium">
          {mode === "login" ? "New to EMMYKING STORES?" : "Already have your credentials?"}
        </p>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="mt-2 inline-flex items-center justify-center rounded-sm border border-input bg-background px-5 py-2 text-xs font-semibold shadow-xs transition hover:bg-accent"
        >
          {mode === "login" ? "Create An Account" : "Switch to Sign In"}
        </button>
      </div>
    </div>
  );
}

