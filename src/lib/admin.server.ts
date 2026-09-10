import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Hardcoded fallback for production Vercel in case env variable is not populated in Vercel settings
const FALLBACK_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YmdncWtob2RkZmt4bXdtb2NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc3NzQ1NywiZXhwIjoyMTA0MzUzNDU3fQ.EtZ6CEC2DNPnlU6ChS5iWXwMxPTcQ5bJSoIHtTxlxag";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ntbggqkhoddfkxmwmoch.supabase.co";

function getServiceRoleKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
        return trimmed.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
  return FALLBACK_SERVICE_ROLE_KEY;
}

function getAdminClient() {
  const serviceKey = getServiceRoleKey();
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}

export const adminCreateProductServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      slug: string;
      brand: string | null;
      category: string;
      description: string | null;
      specifications: string | null;
      price: number | null;
      in_stock: boolean;
      image_url: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sbAdmin = getAdminClient();
    const { data: created, error } = await sbAdmin
      .from("products")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return created;
  });

export const adminUpdateProductServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      patch: {
        name?: string;
        brand?: string | null;
        category?: string;
        description?: string | null;
        specifications?: string | null;
        price?: number | null;
        in_stock?: boolean;
        image_url?: string | null;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const sbAdmin = getAdminClient();
    const { error } = await sbAdmin.from("products").update(data.patch).eq("id", data.id);

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return { success: true };
  });

export const adminDeleteProductServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sbAdmin = getAdminClient();
    const { error } = await sbAdmin.from("products").delete().eq("id", data.id);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    return { success: true };
  });

export const adminReviewPaymentServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      decision: "approved" | "declined";
      note: string;
      adminUserId?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const sbAdmin = getAdminClient();
    const { error } = await sbAdmin
      .from("orders")
      .update({
        payment_status: data.decision,
        status: data.decision === "approved" ? "paid" : "pending",
        admin_note: data.note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: data.adminUserId ?? null,
      })
      .eq("id", data.id);

    if (error) {
      throw new Error(`Failed to review payment: ${error.message}`);
    }

    return { success: true };
  });

export const adminDeleteOrderServer = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const sbAdmin = getAdminClient();
    const { error } = await sbAdmin.from("orders").delete().eq("id", data.id);

    if (error) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }

    return { success: true };
  });

export const adminUpdateStoreSettingsServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      patch: {
        bank_name?: string;
        account_name?: string;
        account_number?: string;
        payment_instructions?: string;
        contact_phone?: string;
        whatsapp_number?: string;
        contact_email?: string;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const sbAdmin = getAdminClient();
    const { error } = await sbAdmin.from("store_settings").update(data.patch).eq("id", data.id);

    if (error) {
      throw new Error(`Failed to update store settings: ${error.message}`);
    }

    return { success: true };
  });
