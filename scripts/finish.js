// Finish Protocol ในคำสั่งเดียว: self-test (Lint + Build + UI Audit: layout/data/touch/font/network) → Telegram (+ LINE ถ้าเปิดไว้) → ป๊อปอัป Windows
// ใช้งาน: npm run finish -- "ข้อความสรุปสั้น"
//         npm run finish -- "ข้อความ" --skip-build   (ส่ง flag ต่อให้ self_test.js เช่น --skip-build, --no-ui, --widths 320,375)
//         npm run finish -- "ข้อความ" --skip-test    (ข้าม Self-Test — ใช้เมื่องานไม่ได้แตะโค้ดเลย)
// ทุกขั้นตอนทำงานเสมอแม้ขั้นก่อนหน้าล้มเหลว — Telegram ส่งข้อความเดียว "📋 สำหรับ Gemini" (ไม่แนบผล Self-Test)
// ผล Self-Test แสดงในป๊อปอัป / LINE / data/self-test/finish.json แทน; Self-Test ไม่ผ่าน = exit code 1
// รันจาก Telegram bot (BOT_JOB=1): ไม่ส่งข้อความเอง — bot ส่งรายงานจบงานเป็นข้อความเดียวให้
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { notify, DEFAULT_MESSAGE } = require("./notify");
const { runSelfTest } = require("./self_test");

const root = path.join(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(root, file);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
}

const args = process.argv.slice(2);
const message = (args[0] && !args[0].startsWith("--") ? args.shift() : "").trim() || DEFAULT_MESSAGE;
const skipTest = args.includes("--skip-test");
const botJob = process.env.BOT_JOB === "1" || process.env.LINE_BOT_JOB === "1";

const sendWith = (script, text) =>
  spawnSync(process.execPath, [path.join(__dirname, script), text], { stdio: "inherit" }).status === 0;

(async () => {
  let test = { ok: true, summary: "Self-test: ข้าม (--skip-test)" };
  if (!skipTest) {
    try {
      test = await runSelfTest(args);
    } catch (error) {
      test = { ok: false, summary: `Self-test: รันไม่สำเร็จ ✗ (${error.message})` };
    }
  }

  // Self-test ไม่ผ่าน: แนบปัญหา 3 ข้อแรก (เช่น "[touch] …", "[network] HTTP 404 …") ให้รู้สาเหตุจากแชทได้ทันที
  const problems = (test.topProblems ?? []).map((p) => `• ${p.slice(0, 160)}`).join("\n");
  const testText = problems ? `${test.summary}\n${problems}` : test.summary;
  const text = `${message}\n${testText}`;

  const resultFile = path.join(root, "data", "self-test", "finish.json");
  fs.mkdirSync(path.dirname(resultFile), { recursive: true });
  fs.writeFileSync(resultFile, JSON.stringify({ at: new Date().toISOString(), message, ok: test.ok, test: testText }, null, 2));

  const failed = [!test.ok && "self-test"];
  const statuses = [];
  if (botJob) {
    statuses.push("Telegram: ข้าม (bot ส่งเอง)");
  } else if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    statuses.push("Telegram: ข้าม (ยังไม่ตั้งค่า)");
  } else {
    const sent = sendWith("send-telegram.js", message);
    statuses.push(sent ? "Telegram: ส่งแล้ว ✓" : "Telegram: ส่งไม่สำเร็จ ✗");
    if (!sent) failed.push("send-telegram");
  }
  // LINE เดิมยังใช้ได้ถ้าเปิด SEND_LINE_NOTIFY=true
  if (!botJob && process.env.SEND_LINE_NOTIFY?.trim().toLowerCase() === "true") {
    const sent = sendWith("send-line.js", text);
    statuses.push(sent ? "LINE: ส่งแล้ว ✓" : "LINE: ส่งไม่สำเร็จ ✗");
    if (!sent) failed.push("send-line");
  }

  if (!notify(message, `${test.summary}\n${statuses.join(" · ")}`)) failed.push("notify");

  const failedSteps = failed.filter(Boolean);
  if (failedSteps.length > 0) {
    console.error(`\nFinish Protocol ไม่ครบ: ${failedSteps.join(", ")} ล้มเหลว`);
    process.exit(1);
  }
  console.log(`\nFinish Protocol ครบ: Self-Test + ${statuses.join(" · ")} + ป๊อปอัป Windows`);
})();
