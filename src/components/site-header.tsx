import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { STORE } from "@/lib/store";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/contact", label: "Contact" },
] as const;

// Placeholder account actions. Accounts are not wired up yet — these buttons
// exist so a real auth flow can be dropped in once a backend is added.
function notifyAccountsComingSoon(action: "Login" | "Sign up") {
  toast.info(`${action} is coming soon`, {
    description: "Accounts aren't live yet. You can still order without one.",
  });
}

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-sm p-1 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/" className="min-w-0">
            <span className="block truncate font-display text-lg leading-none font-semibold tracking-tight sm:text-xl">
              EMMYKING
            </span>
            <span className="eyebrow block text-muted-foreground">Stores</span>
          </Link>
          <nav className="ml-8 hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-sm font-medium text-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <a
            href={STORE.phoneHref}
            className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground xl:flex"
          >
            <Phone className="h-4 w-4" />
            {STORE.phone}
          </a>
          <button
            type="button"
            onClick={() => notifyAccountsComingSoon("Login")}
            className="hidden rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => notifyAccountsComingSoon("Sign up")}
            className="hidden rounded-sm border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent sm:inline-flex"
          >
            Sign Up
          </button>
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1 text-[11px] font-semibold text-primary">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm font-medium text-muted-foreground"
              activeProps={{ className: "py-2.5 text-sm font-medium text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                notifyAccountsComingSoon("Login");
              }}
              className="flex-1 rounded-sm border border-border px-3 py-2 text-sm font-medium"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                notifyAccountsComingSoon("Sign up");
              }}
              className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
