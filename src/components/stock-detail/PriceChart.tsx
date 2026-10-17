"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PricePoint } from "@/types/stock";
import { axisTick, ChartTooltipBox } from "./chart-parts";

const RANGES = [
  { label: "1 ปี", years: 1 },
  { label: "3 ปี", years: 3 },
  { label: "ทั้งหมด", years: Infinity },
] as const;

/** ตัดข้อมูลให้เหลือ N ปีนับจากวันล่าสุดที่มีราคา (วันที่เป็นสตริง YYYY-MM-DD จึงเทียบกันตรงๆ ได้) */
function sliceYears(points: PricePoint[], years: number) {
  if (!Number.isFinite(years) || points.length === 0) return points;
  const last = points[points.length - 1].date;
  const from = `${Number(last.slice(0, 4)) - years}${last.slice(4)}`;
  return points.filter((point) => point.date >= from);
}

const monthLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", { month: "short", year: "2-digit" });

export function PriceChart({ prices }: { prices: PricePoint[] }) {
  const [years, setYears] = useState<number>(1);
  const data = sliceYears(prices, years);

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-500">ยังไม่มีข้อมูลราคาย้อนหลัง</p>;
  }

  const closes = data.map((point) => point.close);
  const change = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          เปลี่ยนแปลงในช่วงนี้{" "}
          <span className={cn("font-mono font-semibold", change >= 0 ? "text-emerald-600" : "text-red-600")}>
            {change >= 0 ? "+" : ""}
            {formatNumber(change)}%
          </span>
        </p>
        <div className="flex gap-1" role="group" aria-label="ช่วงเวลา">
          {RANGES.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setYears(range.years)}
              aria-pressed={years === range.years}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                years === range.years
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              tick={axisTick}
              minTickGap={48}
              tickFormatter={monthLabel}
            />
            <YAxis
              width={52}
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltipBox
                    title={new Date(`${label}T00:00:00`).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                    rows={[
                      {
                        label: "ราคาปิด",
                        value: `${formatNumber(Number(payload[0].value))} บาท`,
                        color: "var(--chart-1)",
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              fill="var(--chart-1)"
              fillOpacity={0.12}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
