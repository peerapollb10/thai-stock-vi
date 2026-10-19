// เล่นเสียงเตือนและแสดงป๊อปอัปแจ้งเตือน (Windows Toast)
// ใช้งาน: npm run notify  (หรือ node scripts/notify.js "ข้อความเอง")
// scripts/finish.js เรียก notify() ต่อจากการส่ง LINE เพื่อแสดงผลการส่งในป๊อปอัปด้วย
const { execFileSync } = require("node:child_process");

const TITLE = "Thai Stock VI — งานเสร็จแล้ว";
const DEFAULT_MESSAGE = "ทำงานเสร็จเรียบร้อยแล้ว";

// Toast ของ Windows ผ่าน WinRT API ใน Windows PowerShell
// ส่งข้อความผ่าน env var และ escape เป็น XML ในสคริปต์ เพื่อไม่ให้อักขระพิเศษในข้อความไปทำให้คำสั่งพัง
// ตรวจ Setting ก่อนแสดง เพราะถ้าผู้ใช้ปิดการแจ้งเตือนไว้ Show() จะเงียบโดยไม่มี error
// duration='long' ค้างบนจอ ~25 วินาที (ค่าปกติ ~7 วินาที)
const windowsToastScript = `
$ErrorActionPreference = 'Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
if ($notifier.Setting -ne 'Enabled') {
  [Console]::Error.Write("Windows ปิดการแจ้งเตือนของ Windows PowerShell อยู่ ($($notifier.Setting)) - เปิดได้ที่ Settings > System > Notifications")
  exit 2
}
$title = [System.Security.SecurityElement]::Escape($env:NOTIFY_TITLE)
$body = [System.Security.SecurityElement]::Escape($env:NOTIFY_BODY)
$detail = [System.Security.SecurityElement]::Escape($env:NOTIFY_DETAIL)
$detailXml = if ($detail) { "<text>$detail</text>" } else { "" }
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast duration='long'><visual><binding template='ToastGeneric'><text>$title</text><text>$body</text>$detailXml</binding></visual><audio src='ms-winsoundevent:Notification.Default'/></toast>")
$notifier.Show([Windows.UI.Notifications.ToastNotification]::new($xml))
`;

/** แสดงป๊อปอัปของระบบปฏิบัติการ (detail = บรรทัดที่สาม เช่น ผลการส่ง LINE) — โยน error ถ้าแสดงไม่ได้ */
function showNotification(message, detail = "") {
  const env = { ...process.env, NOTIFY_TITLE: TITLE, NOTIFY_BODY: message, NOTIFY_DETAIL: detail };
  const quiet = { env, stdio: ["ignore", "ignore", "pipe"] };
  const text = detail ? `${message}\n${detail}` : message;

  if (process.platform === "win32") {
    const encoded = Buffer.from(windowsToastScript, "utf16le").toString("base64");
    // ไม่ใส่ -ExecutionPolicy Bypass: ไม่จำเป็นกับ -EncodedCommand (Execution Policy มีผลกับไฟล์ .ps1 เท่านั้น)
    // และบนเครื่องนี้ Bypass + สคริปต์ Toast ทำให้ powershell.exe ค้างไม่จบ (ทดสอบแล้ว ไม่มี Bypass จบใน ~1 วินาที)
    // timeout กันไว้ ไม่ให้ Finish Protocol ค้างทั้งกระบวนการถ้า PowerShell ค้างอีก
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
      ...quiet,
      timeout: 20_000,
    });
  } else if (process.platform === "darwin") {
    execFileSync(
      "osascript",
      ["-e", 'display notification (system attribute "NOTIFY_BODY") with title (system attribute "NOTIFY_TITLE") sound name "Glass"'],
      { ...quiet, env: { ...env, NOTIFY_BODY: text } },
    );
  } else {
    execFileSync("notify-send", [TITLE, text], quiet);
  }
}

/** เสียง Terminal Bell + ป๊อปอัป — คืนค่า true ถ้าป๊อปอัปแสดงสำเร็จ */
function notify(message = DEFAULT_MESSAGE, detail = "") {
  // Terminal Bell — ดังได้แม้ระบบจะปิดการแจ้งเตือนไว้
  process.stdout.write("\x07");
  try {
    showNotification(message, detail);
    console.log(`แจ้งเตือนแล้ว: ${message}${detail ? ` (${detail})` : ""}`);
    return true;
  } catch (error) {
    const reason = error.stderr?.toString().trim() || error.message;
    console.error(`แสดงป๊อปอัปไม่สำเร็จ (เสียง Terminal Bell ยังทำงาน): ${reason}`);
    return false;
  }
}

module.exports = { notify, DEFAULT_MESSAGE };

if (require.main === module) {
  if (!notify(process.argv[2])) process.exit(1);
}
