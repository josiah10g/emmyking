import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/store";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-[0_18px_40px_-24px_oklch(0_0_0/0.45)]"
    >
      <div className="aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 border-t border-border p-4">
        <p className="eyebrow text-muted-foreground">{product.brand ?? product.category}</p>
        <h3 className="font-sans text-sm leading-snug font-semibold sm:text-base">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
            {product.in_stock ? "Order" : "Enquire"} <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <div className="aspect-square animate-pulse bg-secondary" />
      <div className="space-y-2 border-t border-border p-4">
        <div className="h-3 w-16 animate-pulse rounded-sm bg-secondary" />
        <div className="h-4 w-full animate-pulse rounded-sm bg-secondary" />
        <div className="h-4 w-24 animate-pulse rounded-sm bg-secondary" />
      </div>
    </div>
  );
}
