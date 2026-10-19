// นับจำนวนแถวในตาราง Supabase (อ่านอย่างเดียว)
// ใช้งาน: node scripts/count-rows.js [ชื่อตาราง ...]  (ค่าเริ่มต้น: stock_prices)
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("✗ ไม่พบ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน .env.local");
  process.exit(1);
}

const tables = process.argv.slice(2);
if (tables.length === 0) tables.push("stock_prices");
const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  let failed = false;
  for (const table of tables) {
    const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
    if (error) failed = true;
    console.log(error ? `✗ ${table} — ${error.message}` : `✓ ${table}: ${count.toLocaleString("en-US")} แถว`);
  }
  process.exit(failed ? 1 : 0);
})();
