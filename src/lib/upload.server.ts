import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const FALLBACK_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YmdncWtob2RkZmt4bXdtb2NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc3NzQ1NywiZXhwIjoyMTA0MzUzNDU3fQ.EtZ6CEC2DNPnlU6ChS5iWXwMxPTcQ5bJSoIHtTxlxag";

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

export const uploadProductImageServer = createServerFn({ method: "POST" })
  .validator((data: { base64: string; fileName: string; contentType: string }) => data)
  .handler(async ({ data }) => {
    const serviceKey = getServiceRoleKey();
    const supabaseUrl = process.env.SUPABASE_URL || "https://ntbggqkhoddfkxmwmoch.supabase.co";

    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    }

    const sbAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const buffer = Buffer.from(data.base64, "base64");
    const ext = (data.fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

    const { error } = await sbAdmin.storage
      .from("product-images")
      .upload(filePath, buffer, {
        contentType: data.contentType || "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return { path: filePath };
  });

export const uploadReceiptServer = createServerFn({ method: "POST" })
  .validator((data: { base64: string; fileName: string; contentType: string; reference: string }) => data)
  .handler(async ({ data }) => {
    const serviceKey = getServiceRoleKey();
    const supabaseUrl = process.env.SUPABASE_URL || "https://ntbggqkhoddfkxmwmoch.supabase.co";

    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    }

    const sbAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const buffer = Buffer.from(data.base64, "base64");
    const ext = (data.fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filePath = `${data.reference.toUpperCase()}/${Date.now()}.${ext || "jpg"}`;

    const { error } = await sbAdmin.storage
      .from("payment-receipts")
      .upload(filePath, buffer, {
        contentType: data.contentType || "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return { path: filePath };
  });

export const getSignedReceiptUrlServer = createServerFn({ method: "POST" })
  .validator((data: { path: string }) => data)
  .handler(async ({ data }) => {
    const serviceKey = getServiceRoleKey();
    const supabaseUrl = process.env.SUPABASE_URL || "https://ntbggqkhoddfkxmwmoch.supabase.co";

    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    }

    const sbAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: signed, error } = await sbAdmin.storage
      .from("payment-receipts")
      .createSignedUrl(data.path, 60 * 60); // 1 hour valid

    if (error || !signed?.signedUrl) {
      throw new Error(error?.message || "Could not generate signed receipt URL");
    }

    return { url: signed.signedUrl };
  });
