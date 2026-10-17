"use client"; // Error boundary ต้องเป็น Client Component

import { useEffect } from "react";
import { CloudOff, RotateCw } from "lucide-react";

// แสดงเมื่ออ่านข้อมูลตลาดจาก Supabase ไม่สำเร็จ (ยังไม่ตั้งค่า, ยังไม่รัน market_data.sql, เน็ตหลุด ฯลฯ)
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // ข้อความ error จากเซิร์ฟเวอร์ถูกซ่อนใน production — แสดงเฉพาะตอนพัฒนา
  const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 px-4 py-12 text-center dark:border-red-900">
      <CloudOff className="size-8 text-red-500" />
      <h2 className="font-semibold">โหลดข้อมูลหุ้นไม่สำเร็จ</h2>
      <p className="max-w-md text-sm text-slate-500">
        เชื่อมต่อ Supabase ไม่ได้ — ตรวจสอบอินเทอร์เน็ต, ค่าใน .env.local และว่ารัน supabase/market_data.sql กับ
        npm run fetch-stocks แล้ว
      </p>
      {detail && (
        <p className="max-w-md rounded-lg bg-red-50 px-3 py-2 font-mono text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {detail}
        </p>
      )}
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <RotateCw className="size-4" />
        ลองอีกครั้ง
      </button>
    </div>
  );
}
