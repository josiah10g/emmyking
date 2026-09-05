import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const PRODUCT_IMAGE_BUCKET = "product-images";

/**
 * Product rows store either an absolute URL or a path inside the
 * product-images bucket. Bucket paths get a signed URL for display.
 */
export async function resolveImageUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  const { data } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrl(value, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

async function withImages(rows: Product[]): Promise<Product[]> {
  return Promise.all(
    rows.map(async (row) => ({ ...row, image_url: await resolveImageUrl(row.image_url) })),
  );
}

const SELECT =
  "id, slug, name, brand, category, description, specifications, price, image_url, in_stock, sort_order";

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return withImages((data ?? []) as Product[]);
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withImage] = await withImages([data as Product]);
  return withImage ?? null;
}

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 60_000,
});

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug),
    staleTime: 60_000,
  });
