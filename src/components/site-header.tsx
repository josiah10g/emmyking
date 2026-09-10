import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Menu, Phone, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { STORE } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAuth, signOut } from "@/lib/auth";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const { session, displayName, isAdmin, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const isLoggedIn = !!session;

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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <a
            href={STORE.phoneHref}
            className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground xl:flex"
          >
            <Phone className="h-4 w-4" />
            {STORE.phone}
          </a>

          {/* User circular avatar linking to /account for non-admin logged-in users */}
          {!loading && isLoggedIn && !isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition hover:ring-2 hover:ring-primary/40"
                title="My Account"
              >
                {session?.user?.user_metadata?.avatar_url ? (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt={displayName || "Account"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-foreground">
                    {(displayName || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/80 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:bg-accent hover:border-foreground/40"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}

          {/* Admin: Show circular profile avatar linking to /admin/profile + Sign Out */}
          {!loading && isLoggedIn && isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/profile"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition hover:ring-2 hover:ring-primary/40"
                title="Admin Profile"
              >
                {session?.user?.user_metadata?.avatar_url ? (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt="Admin"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-foreground">
                    {(session?.user?.user_metadata?.full_name || "A").charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border/80 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:bg-accent hover:border-foreground/40"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}

          {/* Logged out visitor: Login & Sign Up buttons */}
          {!loading && !isLoggedIn && (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="rounded-sm border border-border/80 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:bg-accent hover:border-foreground/40"
              >
                Log In
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-sm bg-foreground text-background px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 hover:opacity-90"
              >
                Sign Up
              </Link>
            </div>
          )}

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:opacity-90 hover:shadow-sm"
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

      {/* Mobile slide-out menu */}
      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
          {/* User profile card on mobile for logged-in users */}
          {!loading && isLoggedIn && (
            <div className="flex items-center gap-3 border-b border-border/80 pb-3 mb-2">
              <Link
                to={isAdmin ? "/admin/profile" : "/account"}
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition hover:ring-2 hover:ring-primary/40"
              >
                {session?.user?.user_metadata?.avatar_url ? (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt={displayName || "Account"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    {(displayName || (isAdmin ? "Admin" : "User")).charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName || (isAdmin ? "Store Admin" : "Customer")}
                </p>
                <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
          )}

          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "py-2.5 text-sm font-semibold text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}

          {/* Customer Portal Link */}
          {!loading && isLoggedIn && !isAdmin && (
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "py-2.5 text-sm font-semibold text-foreground" }}
            >
              My Orders & Account
            </Link>
          )}

          {/* Admin link on mobile - ONLY shown if logged in as Admin */}
          {!loading && isLoggedIn && isAdmin && (
            <div className="flex flex-col gap-2 pt-3 border-t border-border/80 mt-2">
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="rounded-sm border border-primary/40 bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary"
              >
                Admin Dashboard
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-3 border-t border-border/80 mt-2">
            {!loading && (
              isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => { signOut(); setOpen(false); }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-border/80 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/auth"
                    search={{ mode: "login" }}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-sm border border-border/80 px-3 py-2 text-center text-sm font-semibold transition hover:bg-accent"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-sm bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Sign Up
                  </Link>
                </div>
              )
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
