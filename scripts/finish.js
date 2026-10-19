// Finish Protocol ในคำสั่งเดียว: send-line → ป๊อปอัป Windows
// ใช้งาน: npm run finish  (หรือ npm run finish -- "ข้อความสรุปสั้น")
// ทุกขั้นตอนทำงานเสมอแม้ขั้นก่อนหน้าล้มเหลว — ป๊อปอัปแสดงผลการส่ง LINE ด้วย เพื่อรู้ผลได้โดยไม่ต้องดู Terminal
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { notify, DEFAULT_MESSAGE } = require("./notify");

const message = process.argv[2]?.trim() || DEFAULT_MESSAGE;

const lineSent = spawnSync(process.execPath, [path.join(__dirname, "send-line.js"), message], { stdio: "inherit" }).status === 0;

const lineStatus = process.env.LINE_BOT_JOB === "1" ? "LINE: ข้าม (bot ส่งเอง)" : lineSent ? "LINE: ส่งแล้ว ✓" : "LINE: ส่งไม่สำเร็จ ✗";
const notified = notify(message, lineStatus);

const failed = [!lineSent && "send-line", !notified && "notify"].filter(Boolean);
if (failed.length > 0) {
  console.error(`\nFinish Protocol ไม่ครบ: ${failed.join(", ")} ล้มเหลว`);
  process.exit(1);
}
console.log("\nFinish Protocol ครบ: LINE + ป๊อปอัป Windows");
