"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";
import type { YearlyFinancials } from "@/types/stock";
import { axisTick, ChartTooltipBox, niceTicks } from "./chart-parts";

const series = [
  { key: "revenue", label: "รายได้", color: "var(--chart-1)" },
  { key: "expenses", label: "รายจ่าย", color: "var(--chart-2)" },
  { key: "netProfit", label: "กำไรสุทธิ", color: "var(--chart-3)" },
] as const;

function formatAxis(billions: number) {
  return formatNumber(billions, Math.abs(billions) >= 10 || Number.isInteger(billions) ? 0 : 1);
}

export function FinancialsChart({ history }: { history: YearlyFinancials[] }) {
  // แปลงเป็นพันล้านบาทก่อนส่งให้กราฟ เพื่อให้ Recharts เลือกขีดแกนเป็นเลขกลมๆ
  // ส่วน Tooltip ใช้ค่าล้านบาทเต็มจาก source
  const data = history.map((year) => ({
    year: String(year.year),
    revenue: year.revenue / 1_000,
    expenses: year.expenses / 1_000,
    netProfit: year.netProfit / 1_000,
    source: year,
  }));
  const hasLoss = history.some((year) => year.netProfit < 0);
  const values = data.flatMap((d) => [d.revenue, d.expenses, d.netProfit]);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-sm">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="20%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis
              width={52}
              ticks={ticks}
              domain={[ticks[0], ticks[ticks.length - 1]]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickFormatter={formatAxis}
            />
            <ReferenceLine y={0} stroke="var(--chart-axis)" />
            <Tooltip
              cursor={{ fill: "var(--chart-cursor)" }}
              content={({ active, label, payload }) => {
                const year = (payload?.[0]?.payload as { source: YearlyFinancials } | undefined)?.source;
                if (!active || !year) return null;
                return (
                  <ChartTooltipBox
                    title={`ปี ${label} (ล้านบาท)`}
                    rows={[
                      ...series.map((s) => ({ label: s.label, value: formatNumber(year[s.key], 0), color: s.color })),
                      { label: "Net Profit Margin", value: formatPercent(year.netProfitMargin) },
                    ]}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={hasLoss && s.key === "netProfit" ? 0 : [4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
