# Project Instructions for Thai Stock VI

- ก่อนเริ่มงานและทุกครั้งที่ทำงานเสร็จในแต่ละ Task:
  - ให้ปฏิบัติตามกฎระเบียบและมาตรฐานการทำงานตามที่กำหนดไว้ในไฟล์กลางระดับ Workspace ที่ตำแหน่ง **`../CLAUDE-RULES.md`**
  - จัดการอัปเดตสรุปผลการทำงานลงในไฟล์ **`summary.txt`** (แบบเขียนทับ Overwrite) ทุกครั้งตามมาตรฐานดังกล่าว
    - หัวข้อ Files Modified / Created ต้องระบุ Path เต็ม, ฟังก์ชัน/คอมโพเนนต์หรือบรรทัดที่เปลี่ยน และเหตุผลของการแก้ไข (ตาม Detailed Code Changes ใน `../CLAUDE-RULES.md` ข้อ 3)
    - บรรทัดล่างสุดต้องเป็น `Last Updated: YYYY-MM-DD HH:mm:ss` เสมอ

- **Finish Protocol** (ทุกครั้งที่ทำ Task, Phase หรือแก้ไขไฟล์ใดๆ เสร็จ — รายละเอียดใน `../CLAUDE-RULES.md` ข้อ 4) รันตามลำดับ:
  1. เขียนทับ `summary.txt`
  2. `npm run copy-summary` — คัดลอกเข้า Clipboard (รองรับภาษาไทยบน Windows) แทนการเรียก `clip` ตรงๆ
  3. `npm run notify` — เสียง Terminal Bell + Toast Notification บน Windows
  4. `npm run send-line` — ส่งสรุปเข้า LINE OA (ค่าตั้งอยู่ใน `.env.local`)
