import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminOrdersQuery,
  deleteOrder,
  PAYMENT_LABELS,
  receiptUrl,
  reviewPayment,
  updateOrderStatus,
  type Order,
} from "@/lib/orders";
import { storeSettingsQuery } from "@/lib/settings";
import { whatsappHref } from "@/lib/settings";
import { formatPrice } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  component: AdminOrders,
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders, isLoading, isError, refetch } = useQuery(adminOrdersQuery);
  const { data: settings } = useQuery(storeSettingsQuery);
  const [filter, setFilter] = useState<"all" | "under_review" | "approved">("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "orders"] });

  const review = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "declined"; note: string }) =>
      reviewPayment(v.id, v.decision, v.note),
    onSuccess: (_d, v) => {
      toast.success(v.decision === "approved" ? "Payment approved" : "Payment declined");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = useMutation({
    mutationFn: (v: { id: string; status: string }) => updateOrderStatus(v.id, v.status),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      toast.success("Order deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = orders ?? [];
    const approved = list.filter((o) => o.payment_status === "approved");
    const revenue = approved.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const customers = new Set(list.map((o) => o.phone.replace(/\D/g, ""))).size;
    return {
      total: list.length,
      awaiting: list.filter((o) => o.payment_status === "under_review").length,
      buyers: approved.length,
      customers,
      revenue,
    };
  }, [orders]);

  const visible = (orders ?? []).filter((o) =>
    filter === "all" ? true : o.payment_status === filter,
  );

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
        <Stat label="Orders" value={String(stats.total)} />
        <Stat label="Receipts to review" value={String(stats.awaiting)} />
        <Stat label="Paid orders" value={String(stats.buyers)} />
        <Stat label="Customers" value={String(stats.customers)} />
        <Stat label="Confirmed revenue" value={formatPrice(stats.revenue || null)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "under_review", "approved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "rounded-sm bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                : "rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
            }
          >
            {f === "all" ? "All" : f === "under_review" ? "Needs review" : "Approved"}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No orders here yet. They appear as soon as a customer checks out.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              whatsapp={settings?.whatsapp_number}
              onReview={(decision, note) => review.mutate({ id: o.id, decision, note })}
              onStatus={(s) => status.mutate({ id: o.id, status: s })}
              onDelete={() => remove.mutate(o.id)}
              busy={review.isPending || status.isPending || remove.isPending}
            />
          ))}
        </ul>
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
  onStatus,
  onDelete,
  busy,
}: {
  order: Order;
  whatsapp: string | undefined;
  onReview: (decision: "approved" | "declined", note: string) => void;
  onStatus: (status: string) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [note, setNote] = useState(order.admin_note ?? "");

  async function openReceipt() {
    if (!order.receipt_path) return;
    const url = await receiptUrl(order.receipt_path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Receipt link could not be created");
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
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
          {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
        </span>
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
        <select
          value={order.status}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-sm border border-input bg-background px-3 py-2 text-xs"
          aria-label="Order status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Approve payment
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onReview("declined", note)}
          className="rounded-sm border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </li>
  );
}
