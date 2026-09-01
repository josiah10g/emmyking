import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail, Phone } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice, STORE } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — EMMYKING STORES" },
      {
        name: "description",
        content:
          "Send your order details to EMMYKING STORES and we confirm price, payment and delivery with you right away.",
      },
      { property: "og:title", content: "Checkout — EMMYKING STORES" },
      { property: "og:description", content: "Submit your order and we confirm payment details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a reachable phone number")
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, "Phone can only contain digits and + ( ) -"),
  email: z.union([z.string().trim().email("Enter a valid email").max(255), z.literal("")]),
  address: z.string().trim().max(500),
  notes: z.string().trim().max(1000),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

function CheckoutPage() {
  const { items, knownTotal, clear } = useCart();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  if (reference) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <p className="eyebrow text-muted-foreground">Order received</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Thank you — we&apos;re on it
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your order reference is <span className="font-semibold text-foreground">{reference}</span>.
          Our team will contact you shortly to confirm the total and share payment details (bank
          transfer or card on delivery).
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <a href={STORE.phoneHref} className="inline-flex items-center gap-2 font-medium">
            <Phone className="h-4 w-4" /> {STORE.phone}
          </a>
          <a href={STORE.emailHref} className="inline-flex items-center gap-2 break-all font-medium">
            <Mail className="h-4 w-4" /> {STORE.email}
          </a>
        </div>
        <Link
          to="/products"
          className="mt-8 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Nothing to check out</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add a device to your cart first, then come back here.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Browse products
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailed(null);
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: String(form.get("customer_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });

    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: parsed.data.customer_name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
        total: knownTotal,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          qty: i.qty,
          price: i.price,
        })),
      })
      .select("reference")
      .single();
    setSubmitting(false);

    if (error || !data) {
      setFailed("We couldn't submit your order. Please try again or call us directly.");
      return;
    }
    clear();
    setReference(data.reference);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-muted-foreground">Checkout</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Order details
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Share your contact and delivery details. We confirm your total and send payment instructions
        — no card details are collected on this page.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Field label="Full name" name="customer_name" error={errors.customer_name} required />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            error={errors.phone}
            required
            hint="We call or WhatsApp this number to confirm."
          />
          <Field label="Email address" name="email" type="email" error={errors.email} />
          <Field label="Delivery address" name="address" error={errors.address} textarea />
          <Field
            label="Notes for us"
            name="notes"
            error={errors.notes}
            textarea
            hint="Colour preference, budget, pickup vs delivery — anything helpful."
          />

          {failed && (
            <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {failed}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting order" : "Place order"}
          </button>
        </form>

        <aside className="h-fit rounded-sm border border-border p-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Your order</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="text-muted-foreground">Qty {i.qty}</span>
                </span>
                <span className="shrink-0 font-semibold">
                  {typeof i.price === "number" ? formatPrice(i.price * i.qty) : "On request"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-sm font-semibold">
            <span>Priced subtotal</span>
            <span>{knownTotal === null ? "On request" : formatPrice(knownTotal)}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Payment options: bank transfer, POS or cash on delivery. Details are shared once your
            order is confirmed.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  type = "text",
  textarea,
  required,
}: {
  label: string;
  name: string;
  error?: string | undefined;
  hint?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  const base =
    "mt-2 w-full rounded-sm border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label} {required && <span className="text-muted-foreground">*</span>}
      </label>
      {textarea ? (
        <textarea id={name} name={name} rows={3} className={`${base} ${error ? "border-destructive" : "border-input"}`} />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          className={`${base} ${error ? "border-destructive" : "border-input"}`}
        />
      )}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
