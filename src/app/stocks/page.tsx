import { Suspense } from "react";
import { StockScreener } from "@/components/stocks/StockScreener";

export default function StocksPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">รายชื่อหุ้น</h1>
        <p className="text-sm text-slate-500">ค้นหา จัดเรียง และคัดกรองหุ้นตามเกณฑ์ VI</p>
      </div>
      {/* StockScreener อ่าน ?q= จาก URL จึงต้องอยู่ใน Suspense */}
      <Suspense>
        <StockScreener />
      </Suspense>
    </div>
  );
}
