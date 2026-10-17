import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Coins, Gauge, Landmark, PiggyBank, TrendingUp } from "lucide-react";
import { RankingCard } from "@/components/dashboard/RankingCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_DATA_AS_OF, mockStocks } from "@/data/mockStocks";
import { formatMarketCap, formatNumber, formatPercent } from "@/lib/format";
import { BASIC_VI_PRESET, criteria, describeCriterion, screenStocks } from "@/lib/screening";
import type { Stock } from "@/types/stock";

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function topBy(key: "pe" | "dividendYield" | "roe", dir: "asc" | "desc", count = 5) {
  const sign = dir === "asc" ? 1 : -1;
  return [...mockStocks]
    .filter((stock) => stock[key] > 0)
    .sort((a, b) => sign * (a[key] - b[key]))
    .slice(0, count);
}

function sectorBreakdown(stocks: Stock[]) {
  const totalCap = stocks.reduce((sum, s) => sum + s.marketCap, 0);
  const groups = new Map<string, { count: number; marketCap: number }>();
  for (const stock of stocks) {
    const group = groups.get(stock.sector) ?? { count: 0, marketCap: 0 };
    group.count += 1;
    group.marketCap += stock.marketCap;
    groups.set(stock.sector, group);
  }
  return [...groups]
    .map(([sector, g]) => ({ sector, ...g, share: (g.marketCap / totalCap) * 100 }))
    .sort((a, b) => b.marketCap - a.marketCap);
}

export default function DashboardPage() {
  const totalMarketCap = mockStocks.reduce((sum, s) => sum + s.marketCap, 0);
  const viPicks = screenStocks(mockStocks, BASIC_VI_PRESET);
  const viRule = criteria
    .filter((c) => BASIC_VI_PRESET.includes(c.id))
    .map((c) => describeCriterion(c))
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ภาพรวมตลาด</h1>
        <p className="text-sm text-slate-500">
          ข้อมูลจำลอง {mockStocks.length} หลักทรัพย์ · ณ {MOCK_DATA_AS_OF}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="มูลค่าตลาดรวม" value={formatMarketCap(totalMarketCap)} hint="บาท" icon={Landmark} />
        <StatCard
          label="P/E (ค่ามัธยฐาน)"
          value={formatNumber(median(mockStocks.map((s) => s.pe)))}
          hint="เท่า"
          icon={Gauge}
        />
        <StatCard
          label="Dividend Yield (ค่ามัธยฐาน)"
          value={formatPercent(median(mockStocks.map((s) => s.dividendYield)))}
          hint="ปันผลปีล่าสุด ÷ ราคาปัจจุบัน"
          icon={Coins}
        />
        <StatCard
          label="ROE (ค่ามัธยฐาน)"
          value={formatPercent(median(mockStocks.map((s) => s.roe)), 1)}
          hint="ปีล่าสุด"
          icon={TrendingUp}
        />
      </div>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="size-4 text-emerald-600" />
              ผ่านเกณฑ์ VI พื้นฐาน {viPicks.length} หลักทรัพย์
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{viRule}</p>
          </div>
          <Link
            href="/stocks?preset=vi"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ปรับเกณฑ์เอง
            <ArrowRight className="size-4" />
          </Link>
        </div>
        {viPicks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {viPicks.map((stock) => (
              <Link
                key={stock.symbol}
                href={`/stocks?q=${stock.symbol}`}
                className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow dark:bg-slate-900"
              >
                <span className="font-semibold">{stock.symbol}</span>
                <span className="ml-2 font-mono text-xs text-slate-500">
                  P/E {formatNumber(stock.pe)} · Yield {formatPercent(stock.dividendYield)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <RankingCard
          title="ปันผลสูงสุด"
          icon={PiggyBank}
          stocks={topBy("dividendYield", "desc")}
          formatValue={(s) => formatPercent(s.dividendYield)}
        />
        <RankingCard
          title="P/E ต่ำสุด"
          icon={Gauge}
          stocks={topBy("pe", "asc")}
          formatValue={(s) => `${formatNumber(s.pe)} เท่า`}
        />
        <RankingCard
          title="ROE สูงสุด"
          icon={TrendingUp}
          stocks={topBy("roe", "desc")}
          formatValue={(s) => formatPercent(s.roe, 1)}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Building2 className="size-4 text-emerald-600" />
          มูลค่าตลาดตามกลุ่มอุตสาหกรรม
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1.5 font-medium">กลุ่ม</th>
                <th className="py-1.5 text-right font-medium">จำนวน</th>
                <th className="py-1.5 text-right font-medium">มูลค่าตลาด</th>
                <th className="py-1.5 text-right font-medium">สัดส่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sectorBreakdown(mockStocks).map((row) => (
                <tr key={row.sector}>
                  <td className="py-1.5">{row.sector}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{row.count}</td>
                  <td className="whitespace-nowrap py-1.5 text-right font-mono tabular-nums">
                    {formatMarketCap(row.marketCap)}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{formatPercent(row.share, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
