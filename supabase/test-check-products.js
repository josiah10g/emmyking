import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf-8");
const envVars = Object.fromEntries(
  envContent
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [
        l.slice(0, idx).trim(),
        l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, ""),
      ];
    })
);

const sb = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: prods } = await sb.from("products").select("id, name, image_url, created_at").order("created_at", { ascending: false }).limit(5);
  console.log("Recent products in DB:", JSON.stringify(prods, null, 2));

  if (prods && prods.length > 0 && prods[0].image_url) {
    const { data: pub } = sb.storage.from("product-images").getPublicUrl(prods[0].image_url);
    console.log("getPublicUrl for latest:", pub);
  }
}

check().catch(console.error);
