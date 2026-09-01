import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { ordersQuery } from "@/lib/products";
import { formatPrice } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: () => (
    <AdminShell>
      <AdminOrders />
    </AdminShell>
  ),
});

const STATUSES = ["pending", "confirmed", "paid", "delivered", "cancelled"] as const;

type OrderItem = { name?: string; qty?: number; price?: number | null };

function AdminOrders() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery(ordersQuery);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error("Could not update", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order deleted");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  if (isError) {
    return (
      <div className="rounded-sm border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load orders.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-sm bg-secondary" />
        ))}
      </div>
    );
  }

  if ((data ?? []).length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border p-10 text-center">
        <h2 className="font-sans text-base font-semibold">No orders yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Customer orders placed from the storefront will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold tracking-tight">Orders</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {(data ?? []).length} order{(data ?? []).length === 1 ? "" : "s"} · update the status as you
        confirm, collect payment and deliver.
      </p>

      <ul className="mt-6 space-y-4">
        {(data ?? []).map((o) => {
          const items = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
          return (
            <li key={o.id} className="rounded-sm border border-border p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <p className="eyebrow text-muted-foreground">{o.reference}</p>
                  <p className="mt-1 truncate text-sm font-semibold">{o.customer_name}</p>
                  <p className="mt-1 text-sm break-words text-muted-foreground">
                    <a href={`tel:${o.phone}`} className="hover:underline">
                      {o.phone}
                    </a>
                    {o.email && (
                      <>
                        {" · "}
                        <a href={`mailto:${o.email}`} className="hover:underline">
                          {o.email}
                        </a>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <select
                    value={o.status}
                    onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value })}
                    className="rounded-sm border border-input bg-background px-2 py-1.5 text-xs font-semibold"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (confirm(`Delete order ${o.reference}?`)) remove.mutate(o.id);
                    }}
                    aria-label="Delete order"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>

              <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
                {items.map((it, idx) => (
                  <li key={idx} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      {it.name ?? "Item"} × {it.qty ?? 1}
                    </span>
                    <span className="shrink-0 font-medium">
                      {typeof it.price === "number"
                        ? formatPrice(it.price * (it.qty ?? 1))
                        : "On request"}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Priced subtotal</span>
                <span className="font-semibold">{formatPrice(o.total)}</span>
              </div>

              {o.address && (
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Deliver to: </span>
                  {o.address}
                </p>
              )}
              {o.notes && (
                <p className="mt-1 text-sm">
                  <span className="text-muted-foreground">Notes: </span>
                  {o.notes}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
