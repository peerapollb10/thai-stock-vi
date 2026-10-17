// ตรวจการตั้งค่า Supabase ของ Phase 4: Anonymous Sign-In, ตาราง, upsert Note และ Row Level Security
// ใช้งาน: npm run check-supabase  (สร้างผู้ใช้ Anonymous ชั่วคราว 1 คน และลบข้อมูลทดสอบทิ้งเมื่อจบ)
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

const options = { auth: { persistSession: false } };
let failed = false;
function report(label, error, detail = "") {
  if (error) failed = true;
  console.log(`${error ? "✗" : "✓"} ${label}${error ? ` — ${error.message ?? error}` : detail}`);
}

(async () => {
  // ไม่มี session: RLS ต้องกันการเขียน
  const guest = createClient(url, key, options);
  const blocked = await guest.from("watchlist_items").insert({ symbol: "TEST" });
  report("RLS กันผู้ที่ไม่ได้ล็อกอิน", blocked.error ? null : new Error("เขียนได้โดยไม่ล็อกอิน!"));

  const sb = createClient(url, key, options);
  const { data: auth, error: authError } = await sb.auth.signInAnonymously();
  report("Anonymous Sign-In", authError);
  if (authError) process.exit(1);
  const userId = auth.user.id;

  const add = await sb.from("watchlist_items").insert({ user_id: userId, symbol: "TEST" });
  report("เพิ่มหุ้นเข้า Watchlist", add.error);
  const list = await sb.from("watchlist_items").select("symbol");
  report("อ่าน Watchlist", list.error, list.data ? ` (${list.data.length} รายการ)` : "");

  const note1 = await sb.from("stock_notes").upsert({ user_id: userId, symbol: "TEST", content: "ทดสอบ 1" });
  const note2 = await sb.from("stock_notes").upsert({ user_id: userId, symbol: "TEST", content: "ทดสอบ 2" });
  const note = await sb.from("stock_notes").select("content").eq("symbol", "TEST").maybeSingle();
  report(
    "บันทึก Note (upsert ทับของเดิม)",
    note1.error ?? note2.error ?? note.error ?? (note.data?.content === "ทดสอบ 2" ? null : new Error("ค่าไม่ตรง")),
  );

  const cleanup = await Promise.all([
    sb.from("watchlist_items").delete().eq("symbol", "TEST"),
    sb.from("stock_notes").delete().eq("symbol", "TEST"),
  ]);
  report("ลบข้อมูลทดสอบ", cleanup.find((r) => r.error)?.error);

  await sb.auth.signOut();
  console.log(failed ? "\nพบปัญหา — ดูรายการ ✗ ด้านบน" : "\nSupabase พร้อมใช้งานสำหรับ Phase 4");
  process.exit(failed ? 1 : 0);
})();
