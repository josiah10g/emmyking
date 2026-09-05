import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  payment_instructions: string;
  contact_phone: string;
  whatsapp_number: string;
  contact_email: string;
};

const SELECT =
  "id, bank_name, account_name, account_number, payment_instructions, contact_phone, whatsapp_number, contact_email";

export async function fetchStoreSettings(): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select(SELECT)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as StoreSettings | null) ?? null;
}

export const storeSettingsQuery = queryOptions({
  queryKey: ["store-settings"],
  queryFn: fetchStoreSettings,
  staleTime: 60_000,
});

export async function updateStoreSettings(
  id: string,
  patch: Partial<Omit<StoreSettings, "id">>,
): Promise<void> {
  const { error } = await supabase.from("store_settings").update(patch).eq("id", id);
  if (error) throw error;
}

/** Digits-only WhatsApp link, falling back to the built-in store number. */
export function whatsappHref(number: string | undefined, text: string): string {
  const digits = (number ?? "").replace(/\D/g, "") || "2347030898561";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
