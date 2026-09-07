import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MASTER_ADMIN_PASSCODE, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Store Admin Login — EMMYKING STORES" },
      {
        name: "description",
        content: "Store management portal for EMMYKING STORES.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, adminLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [isAdmin, navigate]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    setTimeout(() => {
      const success = adminLogin(passcode);
      if (success) {
        toast.success("Welcome back! Entering dashboard...");
        navigate({ to: "/admin" });
      } else {
        setError(`Incorrect password. The master password is: ${MASTER_ADMIN_PASSCODE}`);
      }
      setBusy(false);
    }, 200);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="eyebrow mt-4 text-muted-foreground">Admin Portal</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Store Control Access
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your admin password to access products, orders, receipts, and settings.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="passcode" className="text-sm font-medium">
            Admin Password
          </label>
          <div className="relative mt-2">
            <input
              id="passcode"
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={`Enter password (e.g. ${MASTER_ADMIN_PASSCODE})`}
              className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Default master password: <strong className="text-foreground">{MASTER_ADMIN_PASSCODE}</strong>
          </p>
        </div>

        {error && (
          <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !passcode}
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Unlock Dashboard
        </button>
      </form>
    </div>
  );
}

