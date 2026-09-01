import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSessionUser } from "@/hooks/use-admin";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSessionUser();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || (user && isAdmin === null)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="h-8 w-52 animate-pulse rounded-sm bg-secondary" />
        <div className="mt-6 h-40 w-full animate-pulse rounded-sm bg-secondary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <ShieldAlert className="mx-auto h-8 w-8" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          Admin access required
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in as {user?.email}, but this account has no admin role yet. Ask the store
          owner to grant admin access.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={signOut}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign out
          </button>
          <Link to="/" className="rounded-sm border border-border px-4 py-2 text-sm font-medium">
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="eyebrow text-muted-foreground">Admin dashboard</p>
          <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            EMMYKING STORES
          </h1>
        </div>
        <button
          onClick={signOut}
          className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>

      <nav className="mt-4 flex gap-2">
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          className="rounded-sm border border-border px-4 py-2 text-sm font-medium"
          activeProps={{ className: "rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" }}
        >
          Products
        </Link>
        <Link
          to="/admin/orders"
          className="rounded-sm border border-border px-4 py-2 text-sm font-medium"
          activeProps={{ className: "rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" }}
        >
          Orders
        </Link>
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
