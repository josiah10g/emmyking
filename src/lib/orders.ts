import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";

export const RECEIPT_BUCKET = "payment-receipts";

export type OrderItem = { id: string; slug: string; name: string; price: number | null; qty: number };

export type Order = {
  id: string;
  reference: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  items: OrderItem[];
  total: number | null;
  status: string;
  payment_status: string;
  receipt_path: string | null;
  receipt_uploaded_at: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const PAYMENT_LABELS: Record<string, string> = {
  awaiting_receipt: "Awaiting receipt",
  under_review: "Under review",
  approved: "Payment approved",
  declined: "Payment declined",
};

export type PlaceOrderInput = {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export async function placeOrder(
  input: PlaceOrderInput,
  cart: CartItem[],
  total: number | null,
): Promise<{ id: string; reference: string }> {
  const items: OrderItem[] = cart.map((i) => ({
    id: i.id,
    slug: i.slug,
    name: i.name,
    price: i.price,
    qty: i.qty,
  }));

  const { data: session } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customer_name,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
      items,
      total,
      user_id: session.session?.user.id ?? null,
    })
    .select("id, reference")
    .single();

  if (error) throw error;
  return data as { id: string; reference: string };
}

/** Uploads a receipt file and links it to the order (reference + phone must match). */
export async function uploadReceipt(
  reference: string,
  phone: string,
  file: File,
): Promise<void> {
  if (file.size > 8 * 1024 * 1024) throw new Error("File is larger than 8MB");
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${reference.toUpperCase()}/${Date.now()}.${ext || "bin"}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc("attach_receipt", {
    _reference: reference,
    _phone: phone,
    _path: path,
  });
  if (error) throw error;
  if (data !== true) throw new Error("We couldn't match that order reference and phone number.");
}

export type TrackedOrder = {
  reference: string;
  customer_name: string;
  items: OrderItem[];
  total: number | null;
  status: string;
  payment_status: string;
  admin_note: string | null;
  receipt_uploaded_at: string | null;
  created_at: string;
};

export async function trackOrder(reference: string, phone: string): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc("track_order", {
    _reference: reference,
    _phone: phone,
  });
  if (error) throw error;
  const rows = (data ?? []) as unknown as TrackedOrder[];
  return rows[0] ?? null;
}

/* ---------------------------------- admin --------------------------------- */

const ADMIN_SELECT =
  "id, reference, customer_name, phone, email, address, notes, items, total, status, payment_status, receipt_path, receipt_uploaded_at, admin_note, reviewed_at, created_at";

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

export const adminOrdersQuery = queryOptions({
  queryKey: ["admin", "orders"],
  queryFn: fetchAllOrders,
  staleTime: 15_000,
});

export async function reviewPayment(
  id: string,
  decision: "approved" | "declined",
  note: string,
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: decision,
      status: decision === "approved" ? "paid" : "pending",
      admin_note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.session?.user.id ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

export async function receiptUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}
