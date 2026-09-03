// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Keep in sync with the slugs in src/lib/products.ts so each product page is
// prerendered to static HTML (no server runtime needed on Netlify).
const PRODUCT_SLUGS = [
  "samsung-galaxy-s23-8-128",
  "samsung-galaxy-s21",
  "iphone-11-64gb",
  "iphone-11-pro-256gb",
  "iphone-16-pro-256gb",
  "hp-elitebook-840-g6",
  "google-pixel-9-pro-xl-16-128",
];

export default defineConfig({
  tanstackStart: {
    // Static SPA build: disables the Node crawler that fails on Netlify
    // and produces a clean static client bundle.
    spa: { enabled: true },
    prerender: { enabled: false },
  },
});

