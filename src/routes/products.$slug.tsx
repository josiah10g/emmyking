import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Mail, Phone, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { productQuery } from "@/lib/products";
import { formatPrice, STORE } from "@/lib/store";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => {
    const title = `${params.slug.replace(/-/g, " ")} — EMMYKING STORES`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Full specifications, availability and ordering for this device at EMMYKING STORES.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Specifications, availability and ordering at EMMYKING STORES.",
        },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const { data, isPending, isError, refetch } = useQuery(productQuery(slug));
  const { add } = useCart();
  const navigate = useNavigate();

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-sm bg-secondary" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-secondary" />
          <div className="h-9 w-3/4 animate-pulse rounded-sm bg-secondary" />
          <div className="h-24 w-full animate-pulse rounded-sm bg-secondary" />
          <div className="h-11 w-40 animate-pulse rounded-sm bg-secondary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Fallback
        title="We couldn't load this product"
        body="Something went wrong on our end."
        action={
          <button
            onClick={() => refetch()}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (!data) {
    return (
      <Fallback
        title="Product not found"
        body="This device may have been removed or renamed."
        action={
          <Link
            to="/products"
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to shop
          </Link>
        }
      />
    );
  }

  const item = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    price: data.price,
    image_url: data.image_url,
  };

  const specs = (data.specifications ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All products
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="rounded-sm border border-border bg-secondary">
          {data.image_url ? (
            <img
              src={data.image_url}
              alt={data.name}
              className="mx-auto aspect-square w-full object-contain p-8"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow text-muted-foreground">
            {data.brand ?? "Gadget"} · {data.category}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {data.name}
          </h1>
          <p className="mt-4 text-2xl font-semibold">{formatPrice(data.price)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.price === null
              ? "Submit an order and we'll confirm the current price with you."
              : "Final price confirmed at checkout by our team."}
          </p>

          <span
            className={
              data.in_stock
                ? "mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold"
                : "mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
            }
          >
            <Check className="h-3.5 w-3.5" /> {data.in_stock ? "In stock" : "Available on request"}
          </span>

          {data.description && (
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => {
                add(item);
                navigate({ to: "/checkout" });
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Order now
            </button>
            <button
              onClick={() => {
                add(item);
                toast.success("Added to cart", { description: data.name });
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </button>
          </div>

          <a
            href={whatsappLink(`Hi EMMYKING STORES, I'd like to enquire about the ${data.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
          </a>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href={STORE.phoneHref} className="inline-flex items-center gap-2 hover:text-foreground">
              <Phone className="h-4 w-4" /> {STORE.phone}
            </a>
            <a href={STORE.emailHref} className="inline-flex items-center gap-2 break-all hover:text-foreground">
              <Mail className="h-4 w-4" /> {STORE.email}
            </a>
          </div>

          {specs.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold tracking-tight">Specifications</h2>
              <dl className="mt-4 divide-y divide-border border-y border-border">
                {specs.map((line) => {
                  const [label, ...rest] = line.split(":");
                  const value = rest.join(":").trim();
                  return (
                    <div key={line} className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                      <dt className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                        {value ? label : "Detail"}
                      </dt>
                      <dd className="text-sm">{value || line}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fallback({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}
