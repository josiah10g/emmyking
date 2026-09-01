import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { STORE } from "@/lib/store";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact EMMYKING STORES — Call or Email Us" },
      {
        name: "description",
        content:
          "Reach EMMYKING STORES on +234 703 089 8561 or emmanuelonyedikachi866@gmail.com for prices, stock checks and delivery.",
      },
      { property: "og:title", content: "Contact EMMYKING STORES" },
      {
        property: "og:description",
        content: "Call +234 703 089 8561 or email emmanuelonyedikachi866@gmail.com.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-muted-foreground">Contact</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Talk to EMMYKING STORES
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Need a price, a stock check or advice on which device suits you? Reach us directly — we
        respond quickly during business hours.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <a
          href={STORE.phoneHref}
          className="rounded-sm border border-border p-5 transition-colors hover:bg-accent"
        >
          <Phone className="h-5 w-5" />
          <h2 className="mt-3 font-sans text-sm font-semibold">Call us</h2>
          <p className="mt-1 text-sm break-words text-muted-foreground">{STORE.phone}</p>
        </a>
        <a
          href={STORE.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm border border-border p-5 transition-colors hover:bg-accent"
        >
          <MessageCircle className="h-5 w-5" />
          <h2 className="mt-3 font-sans text-sm font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm break-words text-muted-foreground">Chat with our team</p>
        </a>
        <a
          href={STORE.emailHref}
          className="rounded-sm border border-border p-5 transition-colors hover:bg-accent"
        >
          <Mail className="h-5 w-5" />
          <h2 className="mt-3 font-sans text-sm font-semibold">Email</h2>
          <p className="mt-1 text-sm break-all text-muted-foreground">{STORE.email}</p>
        </a>
      </div>

      <div className="mt-10 rounded-sm border border-border p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Ordering & payment</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>1. Add the devices you want and submit your order details at checkout.</li>
          <li>2. We confirm availability and the final price with you by phone or email.</li>
          <li>3. Pay by bank transfer, POS or cash on delivery, then we dispatch your order.</li>
        </ol>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Start an order
        </Link>
      </div>
    </div>
  );
}
