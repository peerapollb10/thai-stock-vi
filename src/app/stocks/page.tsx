import { Suspense } from "react";
import { StockScreener } from "@/components/stocks/StockScreener";
import { getStocks } from "@/lib/market-data";
import { isViEligible } from "@/lib/screening";

export default async function StocksPage() {
  const allStocks = await getStocks();
  // คัดเฉพาะหุ้นสามัญที่วิเคราะห์ตามเกณฑ์ VI ได้ฝั่ง server — ข้อมูลกองทุน / REIT ไม่ถูกส่งไปหน้าเว็บเลย
  const stocks = allStocks.filter(isViEligible);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">รายชื่อหุ้น</h1>
        <p className="text-sm text-slate-500">ค้นหา จัดเรียง และคัดกรองหุ้นตามเกณฑ์ VI</p>
      </div>
      {/* StockScreener อ่าน ?q= จาก URL จึงต้องอยู่ใน Suspense */}
      <Suspense>
        <StockScreener stocks={stocks} excludedCount={allStocks.length - stocks.length} />
      </Suspense>
    </div>
  );
}
