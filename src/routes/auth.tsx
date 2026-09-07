import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
        content:
          "Sign in or create an EMMYKING STORES account to follow your orders and manage the store.",
      },
      { property: "og:title", content: "Sign in — EMMYKING STORES" },
      { property: "og:description", content: "Access your EMMYKING STORES account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Use at least 6 characters").max(72),
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/admin" });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithPassword(parsed.data.email, parsed.data.password);
        toast.success("Welcome back! Loading dashboard...");
      } else {
        await signUpWithPassword(parsed.data.email, parsed.data.password);
        toast.success("Account created successfully!");
        // Automatically attempt sign in right after signup so user doesn't have to re-enter
        try {
          await signInWithPassword(parsed.data.email, parsed.data.password);
        } catch {
          setMode("login");
        }
      }
    } catch (err: unknown) {
      console.error("[Auth Error]", err);
      const raw = err instanceof Error ? err.message : String(err ?? "");
      const lower = raw.toLowerCase();

      if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
        setError("Invalid email or password. Please verify the credentials or click 'Sign up' if you haven't created this account yet.");
      } else if (lower.includes("email not confirmed") || lower.includes("unconfirmed")) {
        setError("Email not confirmed yet in Supabase. In your Supabase dashboard (Authentication > Users), click '...' next to this user and select 'Auto-confirm user', or turn off 'Confirm email' under Auth Settings.");
      } else if (lower.includes("weak") || lower.includes("easy to guess") || lower.includes("pwned")) {
        setError("Password rejected: Supabase flagged this password as common. In Supabase (Authentication > Email), uncheck 'Prevent use of leaked passwords' to allow simple passwords, or choose another password.");
      } else if (lower.includes("rate limit") || lower.includes("too many requests")) {
        setError("Too many attempts. Supabase has placed a temporary security pause. Please wait a minute before trying again.");
      } else if (lower.includes("user already registered") || lower.includes("already in use")) {
        setError("An account with this email already exists. Please switch to 'Sign in' below.");
      } else if (lower.includes("failed to fetch") || lower.includes("network")) {
        setError("Network/Connection Error: Cannot connect to Supabase. Check your internet connection or verify your Supabase project status.");
      } else {
        setError(`Supabase Error: ${raw}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow text-muted-foreground">Account</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The store owner signs in here to manage products, payments and orders.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
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
        className="mt-6 w-full text-sm text-muted-foreground underline"
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
