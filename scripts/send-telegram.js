// ส่งข้อความแจ้งงานเสร็จเข้า Telegram ผ่าน Bot API (sendMessage) — finish.js เรียกต่อจาก Self-Test
// รูปแบบเดียวกับ bot: ข้อความเดียว "📋 สำหรับ Gemini" + โปรเจกต์ + สรุป (ไม่แนบผล Self-Test)
// ใช้งาน: npm run send-telegram  (หรือ node scripts/send-telegram.js "ข้อความเอง")
// ต้องมี TELEGRAM_BOT_TOKEN และ TELEGRAM_CHAT_ID ใน .env.local — ไม่ตั้งค่า = ข้าม (ไม่นับเป็นข้อผิดพลาด)
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath); // ค่าที่โหลดก่อน (.env.local) มีผลเหนือกว่า
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

// รันจาก Telegram bot (telegram_bot.js ตั้ง BOT_JOB=1) — bot ส่งรายงานจบงานเองอยู่แล้ว ไม่ต้องส่งซ้ำ
if (process.env.BOT_JOB === "1") {
  console.log("ข้ามการส่ง Telegram (รันจาก bot — bot ส่งผลลัพธ์เอง)");
  process.exit(0);
}
if (!TOKEN || !CHAT_ID) {
  console.log("ข้ามการส่ง Telegram (ยังไม่ได้ตั้ง TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)");
  process.exit(0);
}

// ข้อความ Telegram ยาวได้ไม่เกิน 4,096 ตัวอักษร
const MAX_LENGTH = 4096;
let text = `📋 สำหรับ Gemini\nโปรเจกต์: Thai Stock VI\n\n${process.argv[2]?.trim() || "ทำงานเสร็จเรียบร้อยแล้ว"}`;
if (text.length > MAX_LENGTH) text = text.slice(0, MAX_LENGTH - 20) + "\n…(ตัดข้อความ)";

fetch(`${process.env.TELEGRAM_API_BASE || "https://api.telegram.org"}/bot${TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: CHAT_ID, text, link_preview_options: { is_disabled: true } }),
})
  .then(async (res) => {
    const data = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
    if (!data.ok) throw new Error(`${data.error_code ?? res.status}: ${data.description}`);
    console.log(`ส่งข้อความเข้า Telegram แล้ว (${text.length} ตัวอักษร)`);
  })
  .catch((err) => {
    console.error("ส่ง Telegram ไม่สำเร็จ:", err.message);
    process.exit(1);
  });
