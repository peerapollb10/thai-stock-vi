import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { Stock } from "@/types/stock";

interface RankingCardProps {
  title: string;
  icon: LucideIcon;
  stocks: Stock[];
  formatValue: (stock: Stock) => string;
}

export function RankingCard({ title, icon: Icon, stocks, formatValue }: RankingCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-emerald-600" />
        {title}
      </h2>
      <ol className="space-y-1">
        {stocks.map((stock, index) => (
          <li key={stock.symbol}>
            <Link
              href={`/stocks/${stock.symbol}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="w-4 text-xs text-slate-400">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{stock.symbol}</span>
                <span className="ml-2 truncate text-xs text-slate-500">{stock.name}</span>
              </span>
              <span className="font-mono tabular-nums">{formatValue(stock)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
