// ส่วนประกอบที่ใช้ร่วมกันในกราฟ Recharts
export const axisTick = { fill: "var(--chart-muted)", fontSize: 12 };

/** ขีดแกนเป็นเลขกลม (ช่วงละ 1, 2, 2.5 หรือ 5 × 10^n) ครอบทั้งค่าบวกและค่าติดลบ */
export function niceTicks(min: number, max: number, target = 4) {
  const low = Math.min(min, 0);
  const rough = (max - low) / target || 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let t = Math.floor(low / step) * step; t < max + step; t += step) {
    ticks.push(Number(t.toFixed(6)));
  }
  return ticks;
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** กล่อง Tooltip: ข้อความใช้สีตัวอักษรปกติ สีของ series อยู่ที่จุดหน้าแต่ละแถว */
export function ChartTooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 py-0.5">
          {row.color && <span className="size-2.5 rounded-sm" style={{ background: row.color }} />}
          <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
          <span className="ml-auto pl-4 font-mono tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
