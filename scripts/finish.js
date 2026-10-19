// Finish Protocol ในคำสั่งเดียว (หลังเขียนทับ summary.txt แล้ว): copy-summary → send-line → ป๊อปอัป Windows
// ใช้งาน: npm run finish
// ทุกขั้นตอนทำงานเสมอแม้ขั้นก่อนหน้าล้มเหลว — ป๊อปอัปแสดงผลการส่ง LINE ด้วย เพื่อรู้ผลได้โดยไม่ต้องดู Terminal
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { notify, readStatus } = require("./notify");

function run(script) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: "inherit" });
  return result.status === 0;
}

const copied = run("copy-summary.js");
const lineSent = run("send-line.js");

const detail = [lineSent ? "LINE: ส่งแล้ว ✓" : "LINE: ส่งไม่สำเร็จ ✗", copied ? "Clipboard ✓" : "Clipboard ✗"].join(" · ");
const notified = notify(readStatus(), detail);

const failed = [!copied && "copy-summary", !lineSent && "send-line", !notified && "notify"].filter(Boolean);
if (failed.length > 0) {
  console.error(`\nFinish Protocol ไม่ครบ: ${failed.join(", ")} ล้มเหลว`);
  process.exit(1);
}
console.log("\nFinish Protocol ครบ: Clipboard + LINE + ป๊อปอัป Windows");
