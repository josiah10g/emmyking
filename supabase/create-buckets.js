import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Simple env file parser without external deps
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = Object.fromEntries(
  envContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return [key, val];
    })
);

const SUPABASE_URL = envVars.SUPABASE_URL || "https://ntbggqkhoddfkxmwmoch.supabase.co";
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("No SUPABASE_SERVICE_ROLE_KEY found in .env");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Checking buckets with Service Role key...");
  const { data: existing, error: listErr } = await sb.storage.listBuckets();
  if (listErr) {
    console.error("List buckets error:", listErr);
  } else {
    console.log("Existing buckets found:", existing.map((b) => b.name));
  }

  const buckets = [
    { id: "product-images", name: "product-images", publicBucket: true },
    { id: "payment-receipts", name: "payment-receipts", publicBucket: false },
  ];

  for (const b of buckets) {
    const { error } = await sb.storage.createBucket(b.id, {
      public: b.publicBucket,
      fileSizeLimit: 10 * 1024 * 1024,
    });

    if (error) {
      if (error.message?.toLowerCase().includes("already exists")) {
        console.log(`✓ Bucket "${b.id}" already exists.`);
      } else {
        console.error(`✗ Error creating "${b.id}":`, error.message);
      }
    } else {
      console.log(`✓ Bucket "${b.id}" created successfully!`);
    }

    // Make sure product-images is explicitly public
    if (b.id === "product-images") {
      await sb.storage.updateBucket(b.id, { public: true });
    }
  }

  const { data: finalList } = await sb.storage.listBuckets();
  console.log("ALL BUCKETS NOW:", finalList?.map((b) => `${b.name} (public: ${b.public})`));
}

main().catch(console.error);
