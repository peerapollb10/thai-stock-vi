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

export function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
