import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Coins,
  Gauge,
  Landmark,
  LineChart,
  PiggyBank,
  Scale,
  Table2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/stock-detail/DataTable";
import { DividendChart } from "@/components/stock-detail/DividendChart";
import { FinancialsChart } from "@/components/stock-detail/FinancialsChart";
import { PriceChart } from "@/components/stock-detail/PriceChart";
import { PrivateNote } from "@/components/stock-detail/PrivateNote";
import { Section } from "@/components/stock-detail/Section";
import { WatchlistButton } from "@/components/user-data/WatchlistButton";
import { average, calcHistoricalYields, type HistoricalYield } from "@/lib/analytics";
import { formatMarketCap, formatNumber, formatPercent } from "@/lib/format";
import { getPriceHistory, getStockBySymbol, getStocks, latestUpdate } from "@/lib/market-data";
import type { YearlyFinancials } from "@/types/stock";

export async function generateStaticParams() {
  const stocks = await getStocks();
  return stocks.map((stock) => ({ symbol: stock.symbol }));
}

export default async function StockDetailPage({ params }: PageProps<"/stocks/[symbol]">) {
  const { symbol } = await params;
  const [stock, prices] = await Promise.all([getStockBySymbol(symbol), getPriceHistory(symbol)]);
  if (!stock) notFound();

  const yields = calcHistoricalYields(stock);
  const years = stock.history.length;
  const firstYear = stock.history[0]?.year;
  const lastYear = stock.history[years - 1]?.year;

  return (
    <div className="space-y-4">
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 max-md:min-h-11 dark:hover:text-slate-100"
      >
        <ArrowLeft className="size-4" />
        กลับไปรายชื่อหุ้น
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold">{stock.symbol}</h1>
            <WatchlistButton symbol={stock.symbol} variant="labeled" />
          </div>
          <p className="text-sm text-slate-500">
            {stock.name} · {stock.sector}
          </p>
        </div>
        {/* มือถือ: ราคาตกลงบรรทัดใหม่ — ชิดซ้ายให้อ่านต่อจากชื่อบริษัท */}
        <div className="sm:text-right">
          <div className="text-3xl font-semibold">{formatNumber(stock.price)}</div>
          <p className="text-xs text-slate-500">บาท · Yahoo Finance อัปเดต {latestUpdate([stock])}</p>
        </div>
      </header>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="P/E" value={formatNumber(stock.pe)} hint="เท่า (EPS ปีล่าสุด)" icon={Gauge} />
        <StatCard label="P/BV" value={formatNumber(stock.pbv)} hint="เท่า" icon={Scale} />
        <StatCard
          label="Dividend Yield"
          value={formatPercent(stock.dividendYield)}
          hint="ปันผลปีล่าสุด ÷ ราคาปัจจุบัน"
          icon={Coins}
        />
        <StatCard label="ROE" value={formatPercent(stock.roe, 1)} hint={lastYear ? `ปี ${lastYear}` : "ปีล่าสุด"} icon={TrendingUp} />
        <StatCard label="D/E Ratio" value={formatNumber(stock.de)} hint="เท่า" icon={Wallet} />
        <StatCard label="Market Cap" value={formatMarketCap(stock.marketCap)} hint="บาท" icon={Landmark} />
      </div>

      <Section title="ราคาหุ้นย้อนหลัง" subtitle="ราคาปิดรายวัน (บาท)" icon={LineChart}>
        <PriceChart prices={prices} />
      </Section>

      {years === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500 dark:border-slate-700">
          ยังไม่มีข้อมูลงบการเงินรายปีของหุ้นนี้
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section
              title="ประวัติเงินปันผลต่อหุ้น"
              subtitle={`บาท/หุ้น · ปี ${firstYear}–${lastYear}`}
              icon={PiggyBank}
            >
              <DividendChart history={stock.history} />
            </Section>

            <Section
              title="Yield ย้อนหลังเทียบราคาปัจจุบัน"
              subtitle={`ถ้าซื้อที่ราคา ${formatNumber(stock.price)} บาทวันนี้ แล้วได้ปันผลเท่าแต่ละปีในอดีต จะได้ Yield เท่าไร`}
              icon={Coins}
            >
              <DataTable<HistoricalYield>
                rows={yields}
                rowKey={(row) => row.year}
                columns={[
                  { label: "ปี", align: "left", render: (row) => row.year },
                  { label: "ปันผล/หุ้น", render: (row) => formatNumber(row.dividendPerShare) },
                  { label: "ราคาปิดปีนั้น", render: (row) => formatNumber(row.closePrice) },
                  { label: "Yield ณ ปีนั้น", render: (row) => formatPercent(row.yieldAtClose) },
                  {
                    label: "Yield เทียบราคาปัจจุบัน",
                    render: (row) => <span className="font-semibold">{formatPercent(row.yieldOnCurrentPrice)}</span>,
                  },
                ]}
                footer={[
                  `เฉลี่ย ${years} ปี`,
                  formatNumber(average(yields.map((y) => y.dividendPerShare))),
                  null,
                  formatPercent(average(yields.map((y) => y.yieldAtClose))),
                  formatPercent(average(yields.map((y) => y.yieldOnCurrentPrice))),
                ]}
              />
            </Section>
          </div>

          <Section
            title={`รายได้ รายจ่าย และกำไรสุทธิ ${years} ปี`}
            subtitle="แกนตั้งหน่วยพันล้านบาท · รายจ่ายรวมต้นทุนและภาษี (รายได้ − กำไรสุทธิ)"
            icon={BarChart3}
          >
            <FinancialsChart history={stock.history} />
          </Section>

          <Section title="งบการเงินและอัตราส่วนย้อนหลัง" subtitle="หน่วยเงิน: ล้านบาท" icon={Table2}>
            <DataTable<YearlyFinancials>
              rows={stock.history}
              rowKey={(row) => row.year}
              columns={[
                { label: "ปี", align: "left", render: (row) => row.year },
                { label: "รายได้", render: (row) => formatNumber(row.revenue, 0) },
                { label: "รายจ่าย", render: (row) => formatNumber(row.expenses, 0) },
                { label: "กำไรสุทธิ", render: (row) => formatNumber(row.netProfit, 0) },
                { label: "EPS (บาท)", render: (row) => formatNumber(row.eps) },
                { label: "Net Profit Margin", render: (row) => formatPercent(row.netProfitMargin) },
                { label: "ROE", render: (row) => formatPercent(row.roe, 1) },
                { label: "D/E", render: (row) => formatNumber(row.de) },
              ]}
            />
          </Section>
        </>
      )}

      <PrivateNote symbol={stock.symbol} />
    </div>
  );
}
