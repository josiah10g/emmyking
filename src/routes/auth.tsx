import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, KeyRound, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import {
  resetPasswordForEmail,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
  useAuth,
} from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawMode = search.mode as string;
    let mode: "login" | "signup" | "forgot" | "reset" = "login";
    if (rawMode === "signup" || rawMode === "forgot" || rawMode === "reset") {
      mode = rawMode;
    }
    return { mode };
  },
  head: () => ({
    meta: [
      { title: "Login, Sign Up & Recovery — EMMYKING STORES" },
      {
        name: "description",
        content: "Login, create an account, or recover your password on EMMYKING STORES.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(search.mode || "login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, loading, roleLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (search.mode) {
      setMode(search.mode);
    }
  }, [search.mode]);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase auth
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Don't auto-redirect if the user is in the middle of resetting their password
    if (mode === "reset" || mode === "forgot") return;

    // Automatically redirect based on role: Admin -> /admin, Customer -> /account
    if (!loading && !roleLoading && session) {
      if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/account" });
      }
    }
  }, [session, loading, roleLoading, isAdmin, mode, navigate]);

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
  }  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // 1. FORGOT PASSWORD MODE (send recovery email)
    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Please enter your email address to receive password reset instructions.");
        return;
      }
      setError(null);
      setBusy(true);
      try {
        await resetPasswordForEmail(email.trim());
        setResetSent(true);
        toast.success("Password reset email sent! Check your inbox for the recovery link.");
      } catch (err: unknown) {
        console.error("[Forgot Password Error]", err);
        const raw = err instanceof Error ? err.message : String(err ?? "");
        setError(raw);
      } finally {
        setBusy(false);
      }
      return;
    }

    // 2. RESET PASSWORD MODE (type in new password from email link)
    if (mode === "reset") {
      if (password.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        return;
      }
      setError(null);
      setBusy(true);
      try {
        await updatePassword(password);
        toast.success("Password updated successfully! You can now log in with your new password.");
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        navigate({ to: "/auth", search: { mode: "login" } });
      } catch (err: unknown) {
        console.error("[Reset Password Error]", err);
        const raw = err instanceof Error ? err.message : String(err ?? "");
        setError(raw);
      } finally {
        setBusy(false);
      }
      return;
    }

    // 3. SIGNUP MODE VALIDATION
    if (mode === "signup") {
      if (!firstName.trim()) {
        setError("Please enter your first name.");
        return;
      }
      if (!phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup") {
      if (!confirmPassword) {
        setError("Please confirm your password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        return;
      }
    }

    setError(null);
    setBusy(true);

    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
        toast.success("Welcome back! Loading your dashboard...");
        navigate({ to: "/account" });
      } else {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const res = await signUpWithPassword(email, password, fullName, phone.trim());
        
        if (res?.session) {
          toast.success("Account created successfully!");
          navigate({ to: "/account" });
        } else {
          toast.success("Verification link sent! Please check your email inbox to verify your account, then log in.");
          setMode("login");
        }
      }
    } catch (err: unknown) {
      console.error("[Auth Error]", err);
      const raw = err instanceof Error ? err.message : String(err ?? "");
      const lower = raw.toLowerCase();

      if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
        setError("Invalid email or password. Please verify your details or click 'Forgot password?'.");
      } else if (lower.includes("email not confirmed") || lower.includes("unconfirmed")) {
        setError("Email confirmation is enabled in Supabase. Check your inbox or turn off 'Confirm sign up' under Authentication > Emails in Supabase.");
      } else if (lower.includes("user already registered") || lower.includes("already in use")) {
        setError("An account with this email already exists. Please switch to Login.");
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
          {mode === "login"
            ? "Login"
            : mode === "signup"
            ? "Create An Account"
            : mode === "forgot"
            ? "Forgot Password"
            : "Reset Your Password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Login to access your store account and dashboard."
            : mode === "signup"
            ? "Create your store account with your phone number and password."
            : mode === "forgot"
            ? "Enter your registered email address and we will send you a link to reset your password."
            : "Please choose a strong new password for your account."}
        </p>
      </div>

      {/* Prominent Tab Switch Buttons (Only show when in login or signup) */}
      {(mode === "login" || mode === "signup") && (
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
            Log In
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
            Sign Up
          </button>
        </div>
      )}

      {/* Back button for forgot password mode */}
      {mode === "forgot" && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setResetSent(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Log In
          </button>
        </div>
      )}

      {/* If email sent state for forgot mode */}
      {mode === "forgot" && resetSent ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-6 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-foreground">Check Your Email</h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            We have sent a secure password reset link to <strong className="text-foreground">{email}</strong>. Please check your inbox (and spam folder) and click the link to type in your new password.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setResetSent(false);
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Didn't get the email? Try again
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setResetSent(false);
              }}
              className="mt-2 rounded-sm border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
            >
              Return to Login
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    First Name <span className="text-destructive">*</span>
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
                    Last Name
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

              <div>
                <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email input field (shown on login, signup, and forgot modes) */}
          {mode !== "reset" && (
            <div>
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email address <span className="text-destructive">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Password field (shown on login, signup, and reset modes) */}
          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {mode === "reset" ? "New Password" : "Password"} <span className="text-destructive">*</span>
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "reset" ? "At least 6 characters" : "Enter your password"}
                  className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Confirm Password field (shown on signup and reset modes) */}
          {(mode === "signup" || mode === "reset") && (
            <div>
              <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "reset" ? "Confirm New Password" : "Confirm Password"} <span className="text-destructive">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

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
            {mode === "login"
              ? "Login"
              : mode === "signup"
              ? "Create Account & Enter"
              : mode === "forgot"
              ? "Send Reset Link"
              : "Update Password & Login"}
          </button>
        </form>
      )}
    </div>
  );
}

