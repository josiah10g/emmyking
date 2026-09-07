import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { signOut, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Store dashboard — EMMYKING STORES" },
      {
        name: "description",
        content: "Private dashboard for managing EMMYKING STORES products, payments and orders.",
      },
      { property: "og:title", content: "Store dashboard — EMMYKING STORES" },
      { property: "og:description", content: "Manage products, payments and orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Orders & payments", exact: true },
  { to: "/admin/products", label: "Products", exact: false },
  { to: "/admin/settings", label: "Payment details & staff", exact: false },
] as const;

function AdminLayout() {
  const { session, loading, roleLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect to /auth if the user has no active session at all
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">Verifying Administrator Access…</h2>
        <p className="mt-1 text-sm text-muted-foreground">Checking permissions, please hold on.</p>
      </div>
    );
  }

  // If user is logged in, but not granted admin role in Supabase:
  if (session && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <LogOut className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          Admin Access Required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are currently signed in as <strong className="text-foreground">{session.user.email}</strong>, but this account has not been given the administrator role in Supabase yet.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Check Again
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-sm border border-border px-5 py-2 text-xs font-semibold hover:bg-accent"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Admin Portal
            </span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Admin"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your store inventory, review customer bank receipts, and configure store settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            activeProps={{
              className: "rounded-sm bg-foreground px-3 py-2 text-sm font-semibold text-background",
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
