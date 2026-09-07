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
    mutationFn: async (v: { id: string; draft: Draft; file: File | null; removeImage?: boolean }) => {
      const patch: Database["public"]["Tables"]["products"]["Update"] = {
        name: v.draft.name,
        brand: v.draft.brand || null,
        category: v.draft.category || "phones",
        description: v.draft.description || null,
        specifications: v.draft.specifications || null,
        price: v.draft.price.trim() === "" ? null : Number(v.draft.price),
        in_stock: v.draft.in_stock,
      };
      if (v.removeImage) {
        patch.image_url = null;
      } else if (v.file) {
        patch.image_url = await uploadImage(v.file);
      }
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
                    onSubmit={(draft, file, removeImage) => update.mutate({ id: p.id, draft, file, removeImage })}
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

function formatNumberWithCommas(val: string): string {
  const digitsOnly = val.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("en-NG");
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
  onSubmit: (draft: Draft, file: File | null, removeImage?: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "phones",
    description: product?.description ?? "",
    specifications: product?.specifications ?? "",
    price: product?.price === null || product?.price === undefined ? "" : formatNumberWithCommas(String(product.price)),
    in_stock: product?.in_stock ?? true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url ?? null);
  const [removeImage, setRemoveImage] = useState(false);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const input =
    "mt-1.5 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const objUrl = URL.createObjectURL(selected);
      setPreviewUrl(objUrl);
      setRemoveImage(false);
    }
  };

  const handleRemovePhoto = () => {
    setFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      set({ price: "" });
    } else {
      set({ price: formatNumberWithCommas(rawDigits) });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.name.trim().length < 2) {
          toast.error("Give the product a name");
          return;
        }
        // Send pure numeric value to the database
        const numericPrice = draft.price.replace(/,/g, "");
        onSubmit({ ...draft, price: numericPrice }, file, removeImage);
      }}
      className="grid gap-5 rounded-md border border-border bg-card p-6 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2 border-b border-border pb-3">
        <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">Fill in details and preview the product photo before saving.</p>
      </div>

      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Product Name
        <input
          required
          placeholder="e.g. iPhone 15 Pro Max 256GB"
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className={input}
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Brand
        <input
          placeholder="e.g. Apple, Samsung, HP"
          value={draft.brand}
          onChange={(e) => set({ brand: e.target.value })}
          className={input}
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Category
        <select
          value={draft.category}
          onChange={(e) => set({ category: e.target.value })}
          className={input}
        >
          <option value="phones">Phones</option>
          <option value="laptops">Laptops</option>
          <option value="gadgets">Gadgets & Accessories</option>
        </select>
      </label>

      {/* Price with Naira symbol and automatic comma separation */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Price in Naira (leave empty for &ldquo;Price on Request&rdquo;)
        </label>
        <div className="relative mt-1.5 flex items-center">
          <span className="pointer-events-none absolute left-3 font-semibold text-foreground">
            ₦
          </span>
          <input
            value={draft.price}
            onChange={handlePriceChange}
            placeholder="e.g. 850,000"
            inputMode="numeric"
            className="w-full rounded-sm border border-input bg-background py-2.5 pr-3 pl-8 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
        Description
        <textarea
          rows={3}
          placeholder="Brief overview of device condition, color, and warranty..."
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          className={input}
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
        Specifications (Display, RAM, Storage, Battery)
        <textarea
          rows={3}
          placeholder="e.g. Display: 6.7 inch OLED | Storage: 256GB | Battery: 100%"
          value={draft.specifications}
          onChange={(e) => set({ specifications: e.target.value })}
          className={input}
        />
      </label>

      {/* Product photo upload with live confirmation preview */}
      <div className="sm:col-span-2 rounded-md border border-dashed border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Product Photo & Preview
          </label>
          {previewUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-xs text-destructive hover:underline font-semibold"
            >
              Remove photo (leave blank)
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-background shadow-xs flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Product preview"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-center text-xs text-muted-foreground px-2">No photo</span>
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-xs file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {file ? (
                <span className="font-medium text-primary">Selected: {file.name}</span>
              ) : previewUrl ? (
                "Photo uploaded. Click 'Remove photo' above if you want to leave it blank."
              ) : (
                "Upload a high-quality photo of the device (JPG, PNG or WebP)."
              )}
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer sm:col-span-2">
        <input
          type="checkbox"
          checked={draft.in_stock}
          onChange={(e) => set({ in_stock: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        <span>In stock and ready to deliver</span>
      </label>

      {/* Prominent, easy-to-see save button */}
      <div className="sm:col-span-2 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3.5 text-sm font-bold tracking-wide text-primary-foreground shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {product ? "Update & Save Product" : "Confirm & Add Product to Store"}
        </button>
      </div>
    </form>
  );
}
