// ส่งข้อความแจ้งงานเสร็จเข้า LINE ผ่าน LINE Messaging API (push message)
// ทำงานเฉพาะเมื่อ SEND_LINE_NOTIFY=true ใน .env หรือ .env.local
// ใช้งาน: npm run send-line  (หรือ node scripts/send-line.js "ข้อความเอง")
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath); // ค่าที่โหลดก่อน (.env.local) มีผลเหนือกว่า
}

const { SEND_LINE_NOTIFY, LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID } = process.env;

// รันจาก LINE bot (line_bot.js ตั้ง LINE_BOT_JOB=1) — bot ส่งผลลัพธ์ 2 ข้อความเองอยู่แล้ว ไม่ต้องส่งซ้ำ
if (process.env.LINE_BOT_JOB === "1") {
  console.log("ข้ามการส่ง LINE (รันจาก LINE bot — bot ส่งผลลัพธ์เอง)");
  process.exit(0);
}
if (SEND_LINE_NOTIFY?.trim().toLowerCase() !== "true") {
  console.log("ข้ามการส่ง LINE (SEND_LINE_NOTIFY ไม่ได้ตั้งเป็น true)");
  process.exit(0);
}
if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_USER_ID) {
  console.error("ส่ง LINE ไม่ได้: ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ LINE_USER_ID");
  process.exit(1);
}

// ข้อความ LINE ยาวได้ไม่เกิน 5,000 ตัวอักษร
const MAX_LENGTH = 5000;
let text = `Thai Stock VI — ${process.argv[2]?.trim() || "ทำงานเสร็จเรียบร้อยแล้ว"}`;
if (text.length > MAX_LENGTH) text = text.slice(0, MAX_LENGTH - 20) + "\n…(ตัดข้อความ)";

fetch("https://api.line.me/v2/bot/message/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
  },
  body: JSON.stringify({ to: LINE_USER_ID, messages: [{ type: "text", text }] }),
})
  .then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    console.log(`ส่งข้อความเข้า LINE แล้ว (${text.length} ตัวอักษร)`);
  })
  .catch((err) => {
    console.error("ส่ง LINE ไม่สำเร็จ:", err.message);
    process.exit(1);
  });
