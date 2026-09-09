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

async function testUpload() {
  const res = await sb.storage
    .from("product-images")
    .upload("test-admin.txt", Buffer.from("hello"), { upsert: true });
  console.log("Upload as service role:", res);
}

testUpload().catch(console.error);
