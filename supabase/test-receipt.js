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

const sbAdmin = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const sbAnon = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY);

async function inspect() {
  const { data: files, error } = await sbAdmin.storage.from("payment-receipts").list();
  console.log("Root files/folders:", files, error);

  if (files && files.length > 0) {
    for (const f of files) {
      const { data: sub } = await sbAdmin.storage.from("payment-receipts").list(f.name);
      console.log("Folder contents of", f.name, sub);
      if (sub && sub.length > 0) {
        const fullPath = `${f.name}/${sub[0].name}`;
        console.log("Testing full path:", fullPath);
        const { data: adminSigned, error: asErr } = await sbAdmin.storage.from("payment-receipts").createSignedUrl(fullPath, 60);
        console.log("Admin signed URL:", adminSigned?.signedUrl, asErr);

        const { data: anonSigned, error: anErr } = await sbAnon.storage.from("payment-receipts").createSignedUrl(fullPath, 60);
        console.log("Anon signed URL:", anonSigned?.signedUrl, anErr);
      }
    }
  }

  // Also check orders table structure and all records
  const { data: orders, error: oErr } = await sbAdmin.from("orders").select("*");
  console.log("Total orders in DB:", orders?.length, oErr);
  if (orders && orders.length > 0) {
    console.log("First order:", orders[0]);
  }
}

inspect().catch(console.error);
