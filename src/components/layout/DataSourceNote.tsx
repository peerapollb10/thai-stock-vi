import { Database } from "lucide-react";
import { getStocks, latestUpdate } from "@/lib/market-data";

const DISCLAIMER = "ไม่ใช่คำแนะนำการลงทุน";

/**
 * สถานะแหล่งข้อมูลท้าย Sidebar: จำนวนหุ้นจริงในตาราง stocks + วันที่อัปเดตล่าสุด
 * อยู่ใน root layout ซึ่ง error.tsx ครอบไม่ถึง จึงต้องจับ error เองแทนการปล่อยให้ทั้งแอปพัง
 */
export async function DataSourceNote() {
  const stocks = await getStocks().catch(() => null);
  if (!stocks) return <p>เชื่อมต่อแหล่งข้อมูลไม่ได้ · {DISCLAIMER}</p>;

  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
        <Database className="size-3.5 text-emerald-600" />
        Supabase · {stocks.length.toLocaleString("th-TH")} หลักทรัพย์
      </p>
      <p>
        Yahoo Finance · อัปเดต {latestUpdate(stocks)} · {DISCLAIMER}
      </p>
    </div>
  );
}

export function DataSourceNoteFallback() {
  return <p>กำลังโหลดสถานะข้อมูล… · {DISCLAIMER}</p>;
}
