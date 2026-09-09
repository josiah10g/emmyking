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

// Publishable client (like the browser has)
const sbAnon = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Service role client
const sbAdmin = createClient(
  envVars.SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLS() {
  console.log("Testing user logins...");

  // 1. Sign in as admin@gmail.com
  // We can generate a link or check their token
  const { data: link, error: lErr } = await sbAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: "admin@gmail.com",
  });
  console.log("Admin magic link generated:", !!link, lErr);

  // 2. Check if we can do an upload with user auth or service role
  // Let's test what happens when an anon user attempts upload
  const anonUpload = await sbAnon.storage
    .from("product-images")
    .upload("test-anon.txt", Buffer.from("test"));
  console.log("Anon upload to product-images:", anonUpload.error?.message);

  // 3. Let's inspect RLS on storage.objects:
  // Is storage.objects protected by RLS? Yes!
  // What policies exist on storage.objects?
  // Let's query using postgres or check migrations.
}

testRLS().catch(console.error);
