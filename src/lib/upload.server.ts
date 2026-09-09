import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
  return "";
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
