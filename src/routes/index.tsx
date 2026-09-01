import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Headphones, Truck } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { productsQuery } from "@/lib/products";
import { STORE } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EMMYKING STORES — Premium Phones, Laptops & Gadgets" },
      {
        name: "description",
        content:
          "Shop genuine iPhones, Samsung Galaxy, Google Pixel and HP laptops at EMMYKING STORES. Order online and we confirm your price and delivery fast.",
      },
      { property: "og:title", content: "EMMYKING STORES — Premium Phones, Laptops & Gadgets" },
      {
        property: "og:description",
        content: "Genuine phones, laptops and gadgets. Order online or call +234 703 089 8561.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data, isPending, isError, refetch } = useQuery(productsQuery);
  const featured = (data ?? []).slice(0, 4);

  return (
    <div>
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="eyebrow text-primary-foreground/60">Authentic gadget retail</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Flagship devices, without the guesswork.
            </h1>
            <p className="mt-5 max-w-lg text-base text-primary-foreground/75 sm:text-lg">
              {STORE.tagline}. Every device is verified before it reaches you — place an order and
              our team confirms the final price, availability and delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-sm bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
              >
                Browse the collection <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={STORE.phoneHref}
                className="inline-flex items-center gap-2 rounded-sm border border-primary-foreground/30 px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
              >
                Call {STORE.phone}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(data ?? []).slice(0, 4).map((p) => (
              <div key={p.id} className="rounded-sm bg-primary-foreground/95 p-4">
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="mx-auto aspect-square w-full object-contain"
                  />
                )}
              </div>
            ))}
            {isPending &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-sm bg-primary-foreground/20" />
              ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
        {[
          { icon: BadgeCheck, title: "Verified originals", body: "Every phone and laptop checked before dispatch." },
          { icon: Truck, title: "Nationwide delivery", body: "Fast, tracked delivery across Nigeria." },
          { icon: Headphones, title: "Real human support", body: "Call or email and speak to us directly." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-sm border border-border p-5">
            <Icon className="h-5 w-5" />
            <h3 className="mt-3 font-sans text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">Featured</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              This week&apos;s picks
            </h2>
          </div>
          <Link to="/products" className="shrink-0 text-sm font-medium underline underline-offset-4">
            View all
          </Link>
        </div>

        {isError ? (
          <div className="mt-8 rounded-sm border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">We couldn&apos;t load the products.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {isPending
              ? [0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)
              : featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
