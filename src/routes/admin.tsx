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
  const { loading, isAdmin, adminLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/auth" });
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-24 text-sm text-muted-foreground sm:px-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">Dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Store control
          </h1>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
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
