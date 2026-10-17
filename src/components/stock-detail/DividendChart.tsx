"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import type { YearlyFinancials } from "@/types/stock";
import { axisTick, ChartTooltipBox, niceTicks } from "./chart-parts";

export function DividendChart({ history }: { history: YearlyFinancials[] }) {
  const data = history.map((year) => ({ year: String(year.year), dps: year.dividendPerShare }));
  const ticks = niceTicks(0, Math.max(...data.map((d) => d.dps)));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tick={axisTick}
          />
          <YAxis
            width={44}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-cursor)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  title={`ปี ${label}`}
                  rows={[
                    {
                      label: "ปันผล/หุ้น",
                      value: `${formatNumber(Number(payload[0].value))} บาท`,
                      color: "var(--chart-1)",
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar
            dataKey="dps"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="dps"
              position="top"
              fill="var(--chart-label)"
              fontSize={12}
              formatter={(value) => (Number(value) > 0 ? formatNumber(Number(value)) : "งดจ่าย")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
