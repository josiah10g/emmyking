import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Package, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  adminOrdersQuery,
  deleteOrder,
  PAYMENT_LABELS,
  receiptUrl,
  reviewPayment,
  type Order,
} from "@/lib/orders";
import { storeSettingsQuery } from "@/lib/settings";
import { whatsappHref } from "@/lib/settings";
import { formatPrice } from "@/lib/store";
import { sendOrderEmailServer } from "@/lib/email.server";
import { getSignedReceiptUrlServer } from "@/lib/upload.server";
import { adminReviewPaymentServer, adminDeleteOrderServer } from "@/lib/admin.server";

export const Route = createFileRoute("/admin/")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders, isLoading, isError, refetch } = useQuery(adminOrdersQuery);
  const { data: settings } = useQuery(storeSettingsQuery);
  const [viewMode, setViewMode] = useState<"orders" | "customers">("orders");
  const [filter, setFilter] = useState<"all" | "pending" | "successful" | "declined">("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "orders"] });

  const review = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "declined"; note: string; order: Order }) =>
      adminReviewPaymentServer({
        data: {
          id: v.id,
          decision: v.decision,
          note: v.note,
        },
      }),
    onSuccess: (_d, v) => {
      const isApproved = v.decision === "approved";
      toast.success(isApproved ? "Payment marked as Successful" : "Request Declined");
      invalidate();

      // Trigger automated status email to customer
      sendOrderEmailServer({
        data: {
          type: "status_change",
          orderReference: v.order.reference,
          customerName: v.order.customer_name,
          customerPhone: v.order.phone,
          customerEmail: v.order.email,
          deliveryAddress: v.order.address || "Store pickup",
          items: v.order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
          total: v.order.total,
          status: isApproved ? "successful" : "declined",
          adminNote: v.note || null,
        },
      }).catch((err) => console.error("Email trigger error:", err));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteOrderServer({ data: { id } }),
    onSuccess: () => {
      toast.success("Order deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = orders ?? [];
    const successful = list.filter((o) => {
      const s = (o.payment_status || "").toLowerCase();
      return s === "approved" || s === "successful" || s === "paid";
    });
    const pending = list.filter((o) => {
      const s = (o.payment_status || "").toLowerCase();
      return s !== "approved" && s !== "successful" && s !== "paid" && s !== "declined" && s !== "cancelled";
    });
    const revenue = successful.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const customers = new Set(list.map((o) => o.phone.replace(/\D/g, ""))).size;
    return {
      total: list.length,
      awaiting: pending.length,
      buyers: successful.length,
      customers,
      revenue,
    };
  }, [orders]);

  const visible = (orders ?? []).filter((o) => {
    if (filter === "all") return true;
    const s = (o.payment_status || "").toLowerCase();
    if (filter === "successful") return s === "approved" || s === "successful" || s === "paid";
    if (filter === "declined") return s === "declined" || s === "cancelled";
    if (filter === "pending") return s !== "approved" && s !== "successful" && s !== "paid" && s !== "declined" && s !== "cancelled";
    return true;
  });

  const customerGroups = useMemo(() => {
    const list = orders ?? [];
    const map = new Map<
      string,
      { name: string; phone: string; email: string | null; orders: Order[]; totalSpend: number }
    >();

    for (const ord of list) {
      const key = ord.phone.trim().replace(/\D/g, "") || ord.email?.trim().toLowerCase() || ord.customer_name;
      if (!map.has(key)) {
        map.set(key, {
          name: ord.customer_name,
          phone: ord.phone,
          email: ord.email || null,
          orders: [],
          totalSpend: 0,
        });
      }
      const entry = map.get(key)!;
      entry.orders.push(ord);
      const s = (ord.payment_status || "").toLowerCase();
      if (s === "approved" || s === "successful" || s === "paid") {
        entry.totalSpend += ord.total ?? 0;
      }
    }

    return Array.from(map.values());
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p className="text-destructive">We couldn&apos;t load your orders.</p>
        <button type="button" onClick={() => refetch()} className="mt-3 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total Orders" value={String(stats.total)} />
        <Stat label="Pending Requests" value={String(stats.awaiting)} />
        <Stat label="Successful Orders" value={String(stats.buyers)} />
        <Stat label="Unique Customers" value={String(stats.customers)} />
        <Stat label="Confirmed revenue" value={formatPrice(stats.revenue || null)} />
      </div>

      {/* Top Navigation: Orders vs Registered Customers */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode("orders")}
            className={
              viewMode === "orders"
                ? "inline-flex items-center gap-2 rounded-sm bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                : "inline-flex items-center gap-2 rounded-sm border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
            }
          >
            <Package className="h-4 w-4" />
            Order Requests ({orders?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("customers")}
            className={
              viewMode === "customers"
                ? "inline-flex items-center gap-2 rounded-sm bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                : "inline-flex items-center gap-2 rounded-sm border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
            }
          >
            <Users className="h-4 w-4" />
            Customer Accounts ({customerGroups.length})
          </button>
        </div>
      </div>

      {viewMode === "orders" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "successful", "declined"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "rounded-sm bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                    : "rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {f === "all"
                  ? "All Requests"
                  : f === "pending"
                  ? "🟡 Pending"
                  : f === "successful"
                  ? "🟢 Successful"
                  : "🔴 Declined"}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No orders found matching this filter.
            </p>
          ) : (
            <ul className="space-y-4">
              {visible.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  whatsapp={settings?.whatsapp_number}
                  onReview={(decision, note) => review.mutate({ id: o.id, decision, note, order: o })}
                  onDelete={() => remove.mutate(o.id)}
                  busy={review.isPending || remove.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        /* CUSTOMERS DIRECTORY TAB */
        <div className="space-y-4">
          <div className="rounded-sm border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold tracking-tight">Active Customer Directory</h2>
            <p className="text-xs text-muted-foreground">
              All registered users and customers who have submitted orders or requests on EMMYKING STORES.
            </p>
          </div>

          {customerGroups.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No registered customers yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customerGroups.map((cust) => (
                <div key={cust.phone || cust.email || cust.name} className="rounded-sm border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-display font-semibold tracking-tight">{cust.name}</p>
                          <p className="text-xs text-muted-foreground">{cust.phone}</p>
                        </div>
                      </div>
                      {cust.email && <p className="mt-1 text-xs text-muted-foreground break-all">{cust.email}</p>}
                    </div>

                    <div className="text-right">
                      <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                        {cust.orders.length} order{cust.orders.length === 1 ? "" : "s"}
                      </span>
                      <p className="mt-1 text-xs font-bold">{formatPrice(cust.totalSpend)}</p>
                    </div>
                  </div>

                  {/* Customer Orders Breakdown */}
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Submitted Requests:
                    </p>
                    <ul className="mt-2 space-y-2">
                      {cust.orders.map((ord) => {
                        const s = (ord.payment_status || "").toLowerCase();
                        const isSuccess = s === "approved" || s === "successful" || s === "paid";
                        const isDeclined = s === "declined" || s === "cancelled";
                        return (
                          <li
                            key={ord.id}
                            className="flex items-center justify-between rounded-sm border border-border/50 bg-background/50 px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold">{ord.reference}</span>
                              <span className="ml-2 text-muted-foreground">
                                ({ord.items.length} item{ord.items.length === 1 ? "" : "s"})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-medium">
                                {ord.total === null ? "On request" : formatPrice(ord.total)}
                              </span>
                              {isSuccess ? (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                                  Successful
                                </span>
                              ) : isDeclined ? (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive border border-destructive/20">
                                  Declined
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
                                  Pending
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-4 flex gap-2 pt-2 border-t border-border">
                    <a
                      href={whatsappHref(
                        cust.phone,
                        `Hello ${cust.name}, this is EMMYKING STORES contacting you regarding your account:`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      WhatsApp Customer
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function OrderCard({
  order,
  whatsapp,
  onReview,
  onDelete,
  busy,
}: {
  order: Order;
  whatsapp: string | undefined;
  onReview: (decision: "approved" | "declined", note: string) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [note, setNote] = useState(order.admin_note ?? "");

  async function openReceipt() {
    if (!order.receipt_path) return;
    try {
      const res = await getSignedReceiptUrlServer({ data: { path: order.receipt_path } });
      if (res?.url) {
        window.open(res.url, "_blank", "noopener");
      } else {
        toast.error("Receipt link could not be created");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open receipt";
      toast.error(msg);
    }
  }

  return (
    <li className="rounded-sm border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight">{order.reference}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        {(() => {
          const s = (order.payment_status || "").toLowerCase();
          if (s === "approved" || s === "successful" || s === "paid") {
            return (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                Successful
              </span>
            );
          }
          if (s === "declined" || s === "cancelled") {
            return (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive border border-destructive/20">
                Declined
              </span>
            );
          }
          return (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20">
              Pending
            </span>
          );
        })()}
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-muted-foreground">{order.phone}</p>
          {order.email && <p className="break-all text-muted-foreground">{order.email}</p>}
          {order.address && <p className="mt-1 text-muted-foreground">{order.address}</p>}
          {order.notes && <p className="mt-1 text-muted-foreground">Note: {order.notes}</p>}
        </div>
        <div>
          <ul className="space-y-1">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {i.name} × {i.qty}
                </span>
                <span className="shrink-0 font-medium">
                  {typeof i.price === "number" ? formatPrice(i.price * i.qty) : "On request"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span>{order.total === null ? "On request" : formatPrice(order.total)}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {order.receipt_path ? (
          <button
            type="button"
            onClick={openReceipt}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View receipt
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">No receipt uploaded yet</span>
        )}
        <a
          href={whatsappHref(
            whatsapp ?? order.phone,
            `Hello ${order.customer_name}, about your EMMYKING STORES order ${order.reference}:`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"
        >
          WhatsApp customer
        </a>
        {order.email && (
          <a
            href={`mailto:${order.email}?subject=${encodeURIComponent(
              `EMMYKING STORES order ${order.reference}`,
            )}`}
            className="rounded-sm border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            Email customer
          </a>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-sm border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the customer (optional)"
          className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => onReview("approved", note)}
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          Mark as Successful
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onReview("declined", note)}
          className="rounded-sm border border-destructive/40 text-destructive hover:bg-destructive/10 px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Decline Request
        </button>
      </div>
    </li>
  );
}
