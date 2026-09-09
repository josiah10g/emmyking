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
  const { data: users, error: uErr } = await sb.from("user_roles").select("*");
  console.log("user_roles in DB:", users, uErr);

  const { data: authUsers, error: aErr } = await sb.auth.admin.listUsers();
  console.log(
    "auth.users:",
    authUsers?.users?.map((u) => ({ id: u.id, email: u.email })),
    aErr
  );
}

check().catch(console.error);
