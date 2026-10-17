// คัดลอกเนื้อหา summary.txt เข้า Clipboard
// ใช้งาน: npm run copy-summary  (หรือ node scripts/copy-summary.js)
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const summaryPath = path.join(__dirname, "..", "summary.txt");

if (!fs.existsSync(summaryPath)) {
  console.error(`ไม่พบไฟล์ ${summaryPath}`);
  process.exit(1);
}

// ตัด BOM ออก (ถ้ามี) เพื่อไม่ให้ติดไปใน Clipboard
const text = fs.readFileSync(summaryPath, "utf8").replace(/^﻿/, "");

try {
  if (process.platform === "win32") {
    // ถ้าส่ง UTF-8 ให้ clip.exe จะอ่านตาม codepage ของระบบ ทำให้ภาษาไทยเพี้ยน
    // ส่งเป็น UTF-16LE แทน (ไม่ใส่ BOM เพราะ clip จะคัดลอก BOM ติดไปด้วย)
    execFileSync("clip", { input: Buffer.from(text, "utf16le") });
  } else if (process.platform === "darwin") {
    execFileSync("pbcopy", { input: text, env: { ...process.env, LANG: "en_US.UTF-8" } });
  } else {
    execFileSync("xclip", ["-selection", "clipboard"], { input: text });
  }
} catch (error) {
  console.error(`คัดลอกเข้า Clipboard ไม่สำเร็จ: ${error.message}`);
  process.exit(1);
}

console.log(`คัดลอก summary.txt เข้า Clipboard แล้ว (${text.length} ตัวอักษร)`);
