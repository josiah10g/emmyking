import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, productsQuery, type Product } from "@/lib/products";
import { formatPrice } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: () => (
    <AdminShell>
      <AdminProducts />
    </AdminShell>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  brand: z.string().trim().max(80),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(2000),
  specifications: z.string().trim().max(4000),
  price: z.string().trim().max(20),
  image_url: z.string().trim().max(600),
  in_stock: z.boolean(),
});

type FormState = z.infer<typeof schema>;

const empty: FormState = {
  name: "",
  slug: "",
  brand: "",
  category: "Phones",
  description: "",
  specifications: "",
  price: "",
  image_url: "",
  in_stock: true,
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    brand: p.brand ?? "",
    category: p.category,
    description: p.description ?? "",
    specifications: p.specifications ?? "",
    price: p.price === null ? "" : String(p.price),
    image_url: p.image_url ?? "",
    in_stock: p.in_stock,
  };
}

function AdminProducts() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery(productsQuery);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        name: values.name,
        slug: values.slug,
        brand: values.brand || null,
        category: values.category,
        description: values.description || null,
        specifications: values.specifications || null,
        price: values.price === "" ? null : Number(values.price),
        image_url: values.image_url || null,
        in_stock: values.in_stock,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeForm();
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  function closeForm() {
    setEditing(null);
    setCreating(false);
    setForm(empty);
    setErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    if (form.price !== "" && Number.isNaN(Number(form.price))) {
      setErrors({ price: "Price must be a number" });
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  }

  const open = creating || editing !== null;

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight">Products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, edit or remove gadgets. Leave the price empty to show “Price on request”.
          </p>
        </div>
        <button
          onClick={() => {
            closeForm();
            setCreating(true);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New product</span>
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-6 rounded-sm border border-border p-5"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <h3 className="min-w-0 truncate font-sans text-sm font-semibold">
              {editing ? `Editing: ${editing.name}` : "New product"}
            </h3>
            <button type="button" onClick={closeForm} aria-label="Close form" className="shrink-0 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Gadget name"
              value={form.name}
              error={errors.name}
              onChange={(v) => {
                setForm((f) => ({
                  ...f,
                  name: v,
                  slug:
                    !editing && (f.slug === "" || f.slug === slugify(f.name)) ? slugify(v) : f.slug,
                }));
              }}
            />
            <Input
              label="URL slug"
              value={form.slug}
              error={errors.slug}
              onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
            />
            <Input
              label="Brand"
              value={form.brand}
              error={errors.brand}
              onChange={(v) => setForm((f) => ({ ...f, brand: v }))}
            />
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Price (NGN, blank = on request)"
              value={form.price}
              error={errors.price}
              onChange={(v) => setForm((f) => ({ ...f, price: v }))}
            />
            <Input
              label="Image URL"
              value={form.image_url}
              error={errors.image_url}
              onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
            />
            <div className="sm:col-span-2">
              <Input
                label="Description"
                textarea
                value={form.description}
                error={errors.description}
                onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Specifications (one per line, e.g. Storage: 128GB)"
                textarea
                rows={6}
                value={form.specifications}
                error={errors.specifications}
                onChange={(v) => setForm((f) => ({ ...f, specifications: v }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(e) => setForm((f) => ({ ...f, in_stock: e.target.checked }))}
                className="h-4 w-4"
              />
              In stock
            </label>
          </div>

          {form.image_url && (
            <img
              src={form.image_url}
              alt="Product preview"
              className="mt-4 h-24 w-24 rounded-sm border border-border object-contain p-1"
            />
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add product"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-sm border border-border px-5 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isError ? (
        <div className="mt-8 rounded-sm border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load products.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : isPending ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-sm bg-secondary" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No products yet — add your first gadget to open the store.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {(data ?? []).map((p) => (
            <li key={p.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
              <div className="aspect-square rounded-sm bg-secondary">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-contain p-1" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.category} · {formatPrice(p.price)} · {p.in_stock ? "In stock" : "On request"}
                </p>
              </div>
              <div className="col-span-2 flex gap-2 sm:col-span-1">
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(p);
                    setForm(toForm(p));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete “${p.name}”? This cannot be undone.`)) remove.mutate(p.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Input({
  label,
  value,
  onChange,
  error,
  textarea,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  textarea?: boolean;
  rows?: number;
}) {
  const cls = `mt-2 w-full rounded-sm border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring ${
    error ? "border-destructive" : "border-input"
  }`;
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
