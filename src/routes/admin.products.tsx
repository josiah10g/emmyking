import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  PRODUCT_IMAGE_BUCKET,
  productsQuery,
  type Product,
} from "@/lib/products";
import { formatPrice } from "@/lib/store";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Draft = {
  name: string;
  brand: string;
  category: string;
  description: string;
  specifications: string;
  price: string;
  in_stock: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uploadImage(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is larger than 8MB");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, file.type ? { contentType: file.type } : {});
  if (error) throw error;
  return path;
}

function AdminProducts() {
  const qc = useQueryClient();
  const { data: products, isLoading, isError, refetch } = useQuery(productsQuery);
  const [adding, setAdding] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["products"] });

  const create = useMutation({
    mutationFn: async (v: { draft: Draft; file: File | null }) => {
      const image_url = v.file ? await uploadImage(v.file) : null;
      const { error } = await supabase.from("products").insert({
        name: v.draft.name,
        slug: slugify(v.draft.name),
        brand: v.draft.brand || null,
        category: v.draft.category || "phones",
        description: v.draft.description || null,
        specifications: v.draft.specifications || null,
        price: v.draft.price.trim() === "" ? null : Number(v.draft.price),
        in_stock: v.draft.in_stock,
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      setAdding(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; draft: Draft; file: File | null }) => {
      const patch: Database["public"]["Tables"]["products"]["Update"] = {
        name: v.draft.name,
        brand: v.draft.brand || null,
        category: v.draft.category || "phones",
        description: v.draft.description || null,
        specifications: v.draft.specifications || null,
        price: v.draft.price.trim() === "" ? null : Number(v.draft.price),
        in_stock: v.draft.in_stock,
      };
      if (v.file) patch.image_url = await uploadImage(v.file);
      const { error } = await supabase.from("products").update(patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p className="text-destructive">We couldn&apos;t load your products.</p>
        <button type="button" onClick={() => refetch()} className="mt-3 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {products?.length ?? 0} products in your shop
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> {adding ? "Close" : "Add product"}
        </button>
      </div>

      {adding && (
        <ProductForm
          title="New product"
          busy={create.isPending}
          onSubmit={(draft, file) => create.mutate({ draft, file })}
        />
      )}

      {(products ?? []).length === 0 ? (
        <p className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No products yet — add your first device above.
        </p>
      ) : (
        <ul className="space-y-4">
          {(products ?? []).map((p) => (
            <li key={p.id} className="rounded-sm border border-border p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold tracking-tight">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(p.price)} · {p.in_stock ? "In stock" : "Out of stock"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(p.id)}
                  disabled={remove.isPending}
                  className="inline-flex items-center gap-2 rounded-sm border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Edit details</summary>
                <div className="mt-4">
                  <ProductForm
                    title="Edit product"
                    product={p}
                    busy={update.isPending}
                    onSubmit={(draft, file) => update.mutate({ id: p.id, draft, file })}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductForm({
  title,
  product,
  busy,
  onSubmit,
}: {
  title: string;
  product?: Product;
  busy: boolean;
  onSubmit: (draft: Draft, file: File | null) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "phones",
    description: product?.description ?? "",
    specifications: product?.specifications ?? "",
    price: product?.price === null || product?.price === undefined ? "" : String(product.price),
    in_stock: product?.in_stock ?? true,
  });
  const [file, setFile] = useState<File | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const input =
    "mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.name.trim().length < 2) {
          toast.error("Give the product a name");
          return;
        }
        onSubmit(draft, file);
      }}
      className="grid gap-4 rounded-sm border border-border p-5 sm:grid-cols-2"
    >
      <p className="font-display text-lg font-semibold tracking-tight sm:col-span-2">{title}</p>

      <label className="text-sm font-medium">
        Name
        <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={input} />
      </label>
      <label className="text-sm font-medium">
        Brand
        <input value={draft.brand} onChange={(e) => set({ brand: e.target.value })} className={input} />
      </label>
      <label className="text-sm font-medium">
        Category
        <select
          value={draft.category}
          onChange={(e) => set({ category: e.target.value })}
          className={input}
        >
          <option value="phones">Phones</option>
          <option value="laptops">Laptops</option>
          <option value="gadgets">Gadgets</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Price in Naira (leave empty for &ldquo;price on request&rdquo;)
        <input
          value={draft.price}
          onChange={(e) => set({ price: e.target.value.replace(/[^0-9.]/g, "") })}
          inputMode="decimal"
          className={input}
        />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Description
        <textarea
          rows={3}
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          className={input}
        />
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Specifications
        <textarea
          rows={3}
          value={draft.specifications}
          onChange={(e) => set({ specifications: e.target.value })}
          className={input}
        />
      </label>
      <label className="text-sm font-medium">
        Product photo
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 w-full text-sm"
        />
      </label>
      <label className="flex items-center gap-2 self-end text-sm font-medium">
        <input
          type="checkbox"
          checked={draft.in_stock}
          onChange={(e) => set({ in_stock: e.target.checked })}
        />
        In stock
      </label>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save product
      </button>
    </form>
  );
}
