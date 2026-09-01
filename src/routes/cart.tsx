import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — EMMYKING STORES" },
      {
        name: "description",
        content: "Review the devices you selected and continue to checkout at EMMYKING STORES.",
      },
      { property: "og:title", content: "Your Cart — EMMYKING STORES" },
      { property: "og:description", content: "Review your selected devices and place your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, knownTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add a phone or laptop and it will show up here, ready to order.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="divide-y divide-border border-y border-border">
          {items.map((i) => (
            <li key={i.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
              <div className="aspect-square rounded-sm bg-secondary">
                {i.image_url && (
                  <img src={i.image_url} alt={i.name} className="h-full w-full object-contain p-2" />
                )}
              </div>
              <div className="min-w-0">
                <Link
                  to="/products/$slug"
                  params={{ slug: i.slug }}
                  className="text-sm font-semibold hover:underline"
                >
                  {i.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{formatPrice(i.price)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => setQty(i.id, i.qty - 1)}
                    className="rounded-sm border border-border p-1.5"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => setQty(i.id, i.qty + 1)}
                    className="rounded-sm border border-border p-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Remove item"
                    onClick={() => remove(i.id)}
                    className="ml-2 rounded-sm p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="hidden text-right text-sm font-semibold sm:block">
                {typeof i.price === "number" ? formatPrice(i.price * i.qty) : "On request"}
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-sm border border-border p-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd>{items.reduce((n, i) => n + i.qty, 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Priced subtotal</dt>
              <dd className="font-semibold">
                {knownTotal === null ? "On request" : formatPrice(knownTotal)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Items marked “Price on request” are quoted by our team before payment. Delivery is
            confirmed with you after you submit the order.
          </p>
          <Link
            to="/checkout"
            className="mt-5 block rounded-sm bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
          >
            Continue to checkout
          </Link>
          <Link
            to="/products"
            className="mt-2 block rounded-sm border border-border px-4 py-3 text-center text-sm font-medium"
          >
            Keep shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
