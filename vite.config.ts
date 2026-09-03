// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

import { PRODUCTS } from "./src/lib/products";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Static frontend: pre-render every route and ship an SPA shell so the
    // site can be hosted on Netlify without a server runtime.
    spa: { enabled: true },
    pages: [
      { path: "/" },
      { path: "/products" },
      { path: "/cart" },
      { path: "/checkout" },
      { path: "/contact" },
      ...PRODUCTS.map((p) => ({ path: `/products/${p.slug}` })),
    ],
    prerender: { enabled: true, autoStaticPathsDiscovery: false },
  },
});
