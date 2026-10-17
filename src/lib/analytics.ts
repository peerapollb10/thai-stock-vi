import type { Stock } from "@/types/stock";

export interface HistoricalYield {
  year: number;
  dividendPerShare: number;
  closePrice: number;
  /** ปันผลปีนั้น ÷ ราคาปิดปีนั้น — Yield ที่ตลาดเห็นในตอนนั้น (%) */
  yieldAtClose: number;
  /** ปันผลปีนั้น ÷ ราคาปัจจุบัน — ถ้าซื้อวันนี้แล้วได้ปันผลเท่าปีนั้น จะได้ Yield เท่าไร (%) */
  yieldOnCurrentPrice: number;
}

/** นำเงินปันผลแต่ละปีในอดีตมาเทียบกับราคาปัจจุบัน เพื่อดู Yield จริงย้อนหลัง */
export function calcHistoricalYields(stock: Stock): HistoricalYield[] {
  return stock.history.map((year) => ({
    year: year.year,
    dividendPerShare: year.dividendPerShare,
    closePrice: year.closePrice,
    yieldAtClose: (year.dividendPerShare / year.closePrice) * 100,
    yieldOnCurrentPrice: (year.dividendPerShare / stock.price) * 100,
  }));
}

/** ค่าเฉลี่ย ข้ามปีที่ไม่มีข้อมูล (NaN) */
export function average(values: number[]) {
  const known = values.filter(Number.isFinite);
  return known.reduce((sum, value) => sum + value, 0) / known.length;
}

/** ค่ามัธยฐาน ข้ามหุ้นที่ไม่มีข้อมูล (NaN) */
export function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
