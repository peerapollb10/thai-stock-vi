# Project Instructions for Thai Stock VI

- ก่อนเริ่มงานและทุกครั้งที่ทำงานเสร็จในแต่ละ Task:
  - ให้ปฏิบัติตามกฎระเบียบและมาตรฐานการทำงานตามที่กำหนดไว้ในไฟล์กลางระดับ Workspace ที่ตำแหน่ง **`../CLAUDE-RULES.md`**
  - จัดการอัปเดตสรุปผลการทำงานลงในไฟล์ **`summary.txt`** (แบบเขียนทับ Overwrite) ทุกครั้งตามมาตรฐานดังกล่าว
  - หลังเขียน `summary.txt` เสร็จทุกครั้ง ให้คัดลอกเข้า Clipboard ด้วยคำสั่ง **`npm run copy-summary`** (สคริปต์ `scripts/copy-summary.js` — รองรับภาษาไทยบน Windows) แทนการเรียก `clip` ตรงๆ