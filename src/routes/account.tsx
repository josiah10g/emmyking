import { useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogOut, Package, Phone, Mail, User } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/store";
import type { Order } from "@/lib/orders";
import { PAYMENT_LABELS } from "@/lib/orders";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — EMMYKING STORES" },
      {
        name: "description",
        content: "View your order history and account details.",
      },
    ],
  }),
  component: AccountPage,
});

function useMyOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, reference, customer_name, phone, email, address, items, total, status, payment_status, admin_note, receipt_uploaded_at, created_at"
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  awaiting_receipt: "bg-muted text-muted-foreground",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

function AccountPage() {
  const { session, loading, displayName, email } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  const { data: orders, isLoading: ordersLoading } = useMyOrders(
    session?.user?.id
  );

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">
          Loading your account…
        </h2>
      </div>
    );
  }

  if (!session) return null;

  const meta = session.user.user_metadata ?? {};
  const userPhone: string = (meta["phone"] as string | undefined) ?? "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Customer Portal
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {displayName?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's your account overview and order history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut().then(() => navigate({ to: "/" }))}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {/* Account details card */}
      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Account Details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="truncate text-sm font-semibold">
                {displayName ?? "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="truncate text-sm font-semibold">
                {email ?? "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="truncate text-sm font-semibold">
                {userPhone || "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders section */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Your Orders
          </h2>
          {orders && (
            <span className="ml-auto text-xs text-muted-foreground">
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {ordersLoading ? (
          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No orders yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              When you place an order, it will appear here.
            </p>
            <Link
              to="/products"
              className="mt-4 inline-flex items-center justify-center rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-lg border border-border bg-card p-5 transition hover:shadow-sm"
              >
                {/* Order header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold tracking-tight">
                      {order.reference}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_COLORS[order.payment_status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {PAYMENT_LABELS[order.payment_status] ??
                        order.payment_status}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <ul className="mt-4 space-y-1.5">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-foreground">
                        {item.name}{" "}
                        <span className="text-muted-foreground">
                          × {item.qty}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">
                        {typeof item.price === "number"
                          ? formatPrice(item.price * item.qty)
                          : "On request"}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Total */}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold text-primary">
                    {order.total === null ? "On request" : formatPrice(order.total)}
                  </span>
                </div>

                {/* Admin note if any */}
                {order.admin_note && (
                  <div className="mt-3 rounded-sm bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold">Note from store: </span>
                    {order.admin_note}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
