import { queryOptions } from "@tanstack/react-query";

import p1 from "@/assets/p1.png";
import p2 from "@/assets/p2.png";
import p3 from "@/assets/p3.png";
import p4 from "@/assets/p4.png";
import p5 from "@/assets/p5.png";
import p6 from "@/assets/p6.png";
import p7 from "@/assets/p7.png";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  specifications: string | null;
  /** null means "price on request" — we never invent prices. */
  price: number | null;
  image_url: string | null;
  in_stock: boolean;
  sort_order: number;
};

/**
 * Static seeded catalogue. The site ships without a database, so this is the
 * single source of truth for products. Swap these reads for API calls once a
 * backend is wired up.
 */
export const PRODUCTS: Product[] = [
  {
    id: "samsung-galaxy-s23-8-128",
    slug: "samsung-galaxy-s23-8-128",
    name: "Samsung Galaxy S23 8GB RAM 128GB ROM",
    brand: "Samsung",
    category: "Phones",
    description:
      "Flagship Galaxy S23 in Phantom Black with a 6.1-inch Dynamic AMOLED display and pro-grade triple camera system.",
    specifications: [
      'Display: 6.1" Dynamic AMOLED 2X, 120Hz',
      "Memory: 8GB RAM",
      "Storage: 128GB",
      "Rear camera: 50MP + 12MP + 10MP",
      "Front camera: 12MP",
      "Battery: 3900mAh with fast charging",
      "SIM: Dual SIM, 5G",
    ].join("\n"),
    price: null,
    image_url: p1,
    in_stock: true,
    sort_order: 1,
  },
  {
    id: "samsung-galaxy-s21",
    slug: "samsung-galaxy-s21",
    name: "Samsung Galaxy S21",
    brand: "Samsung",
    category: "Phones",
    description:
      "Samsung Galaxy S21 in Phantom Grey — smooth 120Hz display and a versatile triple camera in a compact body.",
    specifications: [
      'Display: 6.2" Dynamic AMOLED 2X, 120Hz',
      "Memory: 8GB RAM",
      "Storage: 128GB",
      "Rear camera: 12MP + 12MP + 64MP",
      "Front camera: 10MP",
      "Battery: 4000mAh",
      "SIM: Dual SIM, 5G",
    ].join("\n"),
    price: null,
    image_url: p2,
    in_stock: true,
    sort_order: 2,
  },
  {
    id: "iphone-11-64gb",
    slug: "iphone-11-64gb",
    name: "iPhone 11 64GB ROM",
    brand: "Apple",
    category: "Phones",
    description:
      "iPhone 11 in White with the dual-camera system and all-day battery life. A dependable everyday iPhone.",
    specifications: [
      'Display: 6.1" Liquid Retina HD',
      "Storage: 64GB",
      "Rear camera: 12MP Wide + 12MP Ultra Wide",
      "Front camera: 12MP TrueDepth",
      "Chip: A13 Bionic",
      "Security: Face ID",
    ].join("\n"),
    price: null,
    image_url: p3,
    in_stock: true,
    sort_order: 3,
  },
  {
    id: "iphone-11-pro-256gb",
    slug: "iphone-11-pro-256gb",
    name: "iPhone 11 Pro 256GB ROM",
    brand: "Apple",
    category: "Phones",
    description:
      "iPhone 11 Pro in Gold with a Super Retina XDR display and the Pro triple-camera system.",
    specifications: [
      'Display: 5.8" Super Retina XDR OLED',
      "Storage: 256GB",
      "Rear camera: 12MP Wide + Ultra Wide + Telephoto",
      "Front camera: 12MP TrueDepth",
      "Chip: A13 Bionic",
      "Build: Stainless steel frame",
    ].join("\n"),
    price: null,
    image_url: p4,
    in_stock: true,
    sort_order: 4,
  },
  {
    id: "iphone-16-pro-256gb",
    slug: "iphone-16-pro-256gb",
    name: "iPhone 16 Pro 256GB ROM",
    brand: "Apple",
    category: "Phones",
    description:
      "iPhone 16 Pro in Black Titanium — the latest Pro camera system, Camera Control and a titanium build.",
    specifications: [
      'Display: 6.3" Super Retina XDR, ProMotion',
      "Storage: 256GB",
      "Rear camera: 48MP Fusion + 48MP Ultra Wide + 12MP Telephoto",
      "Front camera: 12MP TrueDepth",
      "Chip: A18 Pro",
      "Build: Grade 5 titanium",
    ].join("\n"),
    price: null,
    image_url: p5,
    in_stock: true,
    sort_order: 5,
  },
  {
    id: "hp-elitebook-840-g6",
    slug: "hp-elitebook-840-g6",
    name: "HP EliteBook 840 G6",
    brand: "HP",
    category: "Laptops",
    description:
      "Business-class HP EliteBook 840 G6 — slim aluminium chassis, full keyboard and enterprise durability.",
    specifications: [
      'Display: 14" Full HD',
      "Processor: Intel Core i5/i7 (8th Gen)",
      "Memory: 8GB/16GB RAM",
      "Storage: 256GB/512GB SSD",
      "Ports: USB-C, USB-A, HDMI, RJ-45",
      "OS: Windows",
    ].join("\n"),
    price: null,
    image_url: p6,
    in_stock: true,
    sort_order: 6,
  },
  {
    id: "google-pixel-9-pro-xl-16-128",
    slug: "google-pixel-9-pro-xl-16-128",
    name: "Google Pixel 9 Pro XL 16GB RAM 128GB ROM",
    brand: "Google",
    category: "Phones",
    description:
      "Google Pixel 9 Pro XL in Porcelain with the Tensor chip and Google's computational photography.",
    specifications: [
      'Display: 6.8" Super Actua LTPO OLED',
      "Memory: 16GB RAM",
      "Storage: 128GB",
      "Rear camera: 50MP + 48MP Ultra Wide + 48MP Telephoto",
      "Front camera: 42MP",
      "Chip: Google Tensor G4",
    ].join("\n"),
    price: null,
    image_url: p7,
    in_stock: true,
    sort_order: 7,
  },
];

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> =>
    [...PRODUCTS].sort((a, b) => a.sort_order - b.sort_order),
});

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => PRODUCTS.find((p) => p.slug === slug) ?? null,
  });

export const CATEGORIES = ["Phones", "Laptops", "Accessories", "Other"] as const;
