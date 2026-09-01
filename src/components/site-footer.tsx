import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { STORE } from "@/lib/store";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">EMMYKING STORES</h2>
          <p className="mt-3 max-w-sm text-sm text-primary-foreground/70">
            {STORE.tagline}. Genuine devices, honest advice and fast delivery nationwide.
          </p>
        </div>
        <div>
          <p className="eyebrow text-primary-foreground/60">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/products" className="hover:underline">
                All products
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:underline">
                Your cart
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:underline">
                Contact & support
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:underline">
                Admin login
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-primary-foreground/60">Talk to us</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={STORE.phoneHref} className="inline-flex items-center gap-2 hover:underline">
                <Phone className="h-4 w-4 shrink-0" /> {STORE.phone}
              </a>
            </li>
            <li>
              <a href={STORE.emailHref} className="inline-flex items-start gap-2 break-all hover:underline">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" /> {STORE.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 px-4 py-5 text-center text-xs text-primary-foreground/60 sm:px-6">
        © {new Date().getFullYear()} EMMYKING STORES. All rights reserved.
      </div>
    </footer>
  );
}
