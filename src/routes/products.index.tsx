import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { productsQuery } from "@/lib/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Shop All Gadgets — EMMYKING STORES" },
      {
        name: "description",
        content:
          "Browse iPhones, Samsung Galaxy phones, Google Pixel and HP EliteBook laptops in stock at EMMYKING STORES.",
      },
      { property: "og:title", content: "Shop All Gadgets — EMMYKING STORES" },
      {
        property: "og:description",
        content: "Phones, laptops and gadgets in stock. Order online in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data, isPending, isError, refetch } = useQuery(productsQuery);
  const [category, setCategory] = useState<string>("All");
  const [q, setQ] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set((data ?? []).map((p) => p.category)))],
    [data],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (term === "" ||
          p.name.toLowerCase().includes(term) ||
          (p.brand ?? "").toLowerCase().includes(term)),
    );
  }, [data, category, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-muted-foreground">Collection</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        All products
      </h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Tap any device for full specifications, then place an order and we&apos;ll confirm price,
        availability and delivery with you.
      </p>

      <div className="mt-8 grid gap-3 border-y border-border py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative min-w-0">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or brand"
            aria-label="Search products"
            className="w-full rounded-sm border border-input bg-background py-2.5 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-sm border px-3 py-2 text-xs font-semibold transition-colors",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="mt-12 rounded-sm border border-border p-10 text-center">
          <h2 className="font-sans text-base font-semibold">Products didn&apos;t load</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : isPending ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-sm border border-dashed border-border p-10 text-center">
          <h2 className="font-sans text-base font-semibold">No products match that search</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different keyword or clear the filters.
          </p>
          <button
            onClick={() => {
              setQ("");
              setCategory("All");
            }}
            className="mt-4 rounded-sm border border-border px-4 py-2 text-sm font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
