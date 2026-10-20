# Project Instructions & Workflow Standards for Thai Stock VI

## 1. มาตรฐานการบันทึกผลและติดตามงาน (Task Tracking)
- **โปรเจกต์นี้ไม่ใช้ `summary.txt` / `summary.md`** — ห้ามสร้างไฟล์สรุปขึ้นมาใหม่
- บันทึกสถานะงานหลักไว้ใน **`task.md`** เพียงไฟล์เดียว: เพิ่ม/ติ๊ก `- [x]` รายการงานใน Phase ที่เกี่ยวข้อง พร้อมระบุไฟล์ที่แก้และเหตุผลสั้นๆ
- รายละเอียดทางเทคนิค (ไฟล์ที่แก้, ฟังก์ชัน/บรรทัด, ผลการตรวจ) ให้รายงานในคำตอบแชทแทน

## 2. Finish Protocol (กระบวนการจบงานอัตโนมัติทุกครั้ง)
เมื่อทำ Task, Phase หรือแก้ไขไฟล์ใดๆ เสร็จเรียบร้อยแล้ว ให้ทำตามลำดับต่อไปนี้โดยอัตโนมัติทุกครั้ง:
1. อัปเดตสถานะงานใน `task.md` ให้เป็นปัจจุบัน
2. รันคำสั่ง `npm run finish -- "สรุปสั้นหนึ่งบรรทัด"` — ซึ่งจะรันทุกขั้นตอนต่อไปนี้ตามลำดับอัตโนมัติ:
   - **`npm run self-test`** — ตรวจเช็ก Lint + Build + จำลองเปิดหน้าเว็บด้วย Headless Edge ที่ 375/768/1280px ตรวจสอบ 5 หมวด:
     * `[layout]` ล้นจอ/ตารางเลื่อนแนวนอน
     * `[data]` คำต้องห้าม (Mock/Dummy/ข้อมูลจำลอง/undefined/null/NaN), จำนวนหุ้นตรงกับ Supabase (633 ตัว), Empty State ของ /stocks
     * `[touch]` จอ < 768px ปุ่ม/ลิงก์ ≥ 44×44px (รวมเมนู Sidebar)
     * `[font]` จอ < 768px ตัวอักษร ≥ 12px
     * `[network]` HTTP 4xx/5xx, console.error, JS exception
     *(ผล + ภาพหน้าจอใน `data/self-test/`); หากพบข้อผิดพลาด ให้แก้ไขแล้วรัน finish ใหม่ — ห้ามรายงานว่างานเสร็จทั้งที่ Self-test ✗*
     *ใช้ `--skip-build` เพื่อใช้ build เดิม หรือ `--skip-test` เฉพาะงานที่ไม่ได้แตะโค้ด*
   - **`npm run send-telegram`** — ส่งข้อความเดียว "📋 สำหรับ Gemini" เข้า Telegram (ไม่แนบผล Self-Test — ดูผลในป๊อปอัป/`data/self-test/`; ข้ามอัตโนมัติเมื่อรันจาก Telegram bot — bot ส่งรายงานจบงานเป็นข้อความเดียวเอง)
     (LINE เดิม `npm run send-line` ส่งด้วยเฉพาะเมื่อตั้ง `SEND_LINE_NOTIFY=true`)
   - **`npm run notify`** — เสียง Terminal Bell + ป๊อปอัป Toast บน Windows (แสดงผลการส่ง Telegram ในป๊อปอัปด้วย)

## 3. การรันแบบ Autonomous Mode (งานยาวโดยไม่ต้องรออนุมัติทีละคำสั่ง)
- **สิทธิ์ประจำโปรเจกต์อยู่ใน `.claude/settings.json`**:
  - `defaultMode: "acceptEdits"` — แก้ไฟล์ในโปรเจกต์ได้โดยไม่ต้องถามทุกครั้ง
  - `allow` — คำสั่งที่ใช้ประจำ: `npm run *`, `git *`, `node scripts/*`, `.venv/Scripts/python *`, `npx next *`, `curl … http://localhost:*`
  - `deny` (มีผลเหนือ allow เสมอ) — `git push --force` / `-f`, `git reset --hard`, `git clean -f`, `rm -rf`, และอ่าน `.env.local` / `.env` (Secret key ใช้ผ่านสคริปต์เท่านั้น)
- **แนวทางให้รันต่อเนื่องได้ราบรื่น**:
  - คำสั่งที่ไม่จบเอง (`npm run dev`, `npm run start`, `npm run bot`) ให้รันแบบ background เสมอ แล้วตรวจด้วย HTTP request แทนการรอ
  - คำสั่งที่อาจค้าง (`fetch-stocks` ทั้งตลาด, PowerShell) ให้ใส่ timeout และรันใน background หากใช้เวลาเกิน 2 นาที
  - ห้ามใช้คำสั่งแบบ interactive (`git rebase -i`) — ใส่ flag ไม่ถามแทน เช่น `-Confirm:$false`
  - ก่อนลบ/เขียนทับ/push ให้ตรวจเป้าหมายก่อน; งานที่ย้อนกลับยาก (push, ลบข้อมูลใน Supabase) ยังต้องได้รับคำสั่งอนุมัติชัดเจนผ่านปุ่มอนุมัติของ Telegram bot

## 4. นโยบายการดึงข้อมูลหุ้น SET (`scripts/fetch_stocks.py`)
- **ขอบเขตปกติ**: `npm run fetch-stocks` ดึงเฉพาะหุ้นในรายชื่อ `STOCKS` (10 ตัว) — ใช้อัปเดตประจำวัน
- **เพิ่มบางตัว**: `npm run fetch-stocks -- --symbols SCB BBL GULF`
- **ทั้งตลาด (ทำเมื่อผู้ใช้สั่งเท่านั้น)**:
  1. ผู้ใช้ดาวน์โหลด CSV ไว้ที่ `data/set_symbols.csv` (ต้องมีคอลัมน์ `Symbol`) — ห้ามเขียนสคริปต์ดึงอัตโนมัติเพราะมีระบบกันบอท
  2. ทดสอบก่อน: `npm run fetch-stocks -- --symbols-file data/set_symbols.csv --market SET --limit 5 --dry-run`
  3. รันจริง background: `npm run fetch-stocks -- --symbols-file data/set_symbols.csv --market SET --period 2y --skip-fresh 20`
  4. ใช้ `--delay` อย่างน้อย 1 วินาที ไม่รันซ้ำบ่อยกว่าวันละครั้ง
  5. หลังดึงทั้งตลาด หน้าเว็บเห็นข้อมูลใหม่ภายใน 1 ชม. (cache) และรายงานจำนวนหุ้นที่ Sidebar อัตโนมัติ
