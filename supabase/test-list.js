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

async function testQuery() {
  // Let's check objects in storage.objects
  const { data, error } = await sb.storage.from("product-images").list();
  console.log("List objects in product-images:", data, error);
}

testQuery().catch(console.error);
