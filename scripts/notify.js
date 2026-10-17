// เล่นเสียงเตือนและแสดงป๊อปอัปแจ้งเตือน โดยดึงบรรทัด Status จาก summary.txt
// ใช้งาน: npm run notify  (หรือ node scripts/notify.js "ข้อความเอง")
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const TITLE = "Thai Stock VI — งานเสร็จแล้ว";
const summaryPath = path.join(__dirname, "..", "summary.txt");

function readStatus() {
  try {
    const text = fs.readFileSync(summaryPath, "utf8");
    return text.match(/^﻿?Status:\s*(.+)$/m)?.[1].trim();
  } catch {
    return undefined;
  }
}

const message = process.argv[2] ?? readStatus() ?? "ทำงานเสร็จเรียบร้อยแล้ว";

// Toast ของ Windows ผ่าน WinRT API ใน Windows PowerShell
// ส่งข้อความผ่าน env var และ escape เป็น XML ในสคริปต์ เพื่อไม่ให้อักขระพิเศษในข้อความไปทำให้คำสั่งพัง
const windowsToastScript = `
$ErrorActionPreference = 'Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$title = [System.Security.SecurityElement]::Escape($env:NOTIFY_TITLE)
$body = [System.Security.SecurityElement]::Escape($env:NOTIFY_BODY)
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$title</text><text>$body</text></binding></visual><audio src='ms-winsoundevent:Notification.Default'/></toast>")
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
`;

function notify() {
  const env = { ...process.env, NOTIFY_TITLE: TITLE, NOTIFY_BODY: message };
  const quiet = { env, stdio: ["ignore", "ignore", "pipe"] };

  if (process.platform === "win32") {
    const encoded = Buffer.from(windowsToastScript, "utf16le").toString("base64");
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      quiet,
    );
  } else if (process.platform === "darwin") {
    execFileSync(
      "osascript",
      ["-e", 'display notification (system attribute "NOTIFY_BODY") with title (system attribute "NOTIFY_TITLE") sound name "Glass"'],
      quiet,
    );
  } else {
    execFileSync("notify-send", [TITLE, message], quiet);
  }
}

// Terminal Bell — ดังได้แม้ระบบจะปิดการแจ้งเตือนไว้
process.stdout.write("\x07");

try {
  notify();
  console.log(`แจ้งเตือนแล้ว: ${message}`);
} catch (error) {
  const detail = error.stderr?.toString().trim() || error.message;
  console.error(`แสดงป๊อปอัปไม่สำเร็จ (เสียง Terminal Bell ยังทำงาน): ${detail}`);
  process.exit(1);
}
