"""ดึงข้อมูลหุ้นไทยจริงจาก Yahoo Finance (yfinance) แล้ว upsert เข้า Supabase

ตารางปลายทาง (สร้างด้วย supabase/market_data.sql):
  stocks            ข้อมูลพื้นฐาน + ค่าล่าสุด (P/E, P/BV, Yield, ROE, D/E, Market Cap)
  stock_prices      ราคาย้อนหลังรายวัน
  stock_financials  งบการเงินรายปี (ล้านบาท) ตรงกับ YearlyFinancials ใน src/types/stock.ts

ใช้งาน (หลังติดตั้งแพ็กเกจจาก requirements.txt):
  npm run fetch-stocks                              ดึงหุ้นทั้งหมดใน STOCKS แล้วเขียนเข้า Supabase
  npm run fetch-stocks -- --symbols PTT KBANK       ดึงเฉพาะบางตัว (ชื่อย่อ SET ไม่ต้องมี .BK)
  npm run fetch-stocks -- --dry-run --out out.json  ไม่เขียน Supabase, บันทึกผลเป็น JSON แทน

ต้องมีใน .env.local: NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SECRET_KEY (sb_secret_... หรือ service_role key)
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent

# ชื่อย่อ SET → กลุ่มอุตสาหกรรมตาม type Sector (Yahoo ใช้ชื่อกลุ่มคนละแบบกับ SET)
STOCKS: dict[str, str] = {
    "PTT": "Energy & Utilities",
    "BDMS": "Health Care Services",
    "ADVANC": "Information & Communication Technology",
    "CPALL": "Commerce",
    "SCC": "Construction Materials",
    "KBANK": "Banking",
    "AOT": "Transportation & Logistics",
    "TISCO": "Banking",
    "CPN": "Property Development",
    "DELTA": "Electronic Components",
}

MILLION = 1_000_000
PRICE_BATCH = 500
# ปันผลที่ XD ก่อนเดือนนี้ถือเป็นปันผลงวดสุดท้ายของปีก่อน (หุ้นไทยส่วนใหญ่จ่ายงวดสุดท้ายช่วง มี.ค.–พ.ค.)
INTERIM_FROM_MONTH = 7


def clean(value):
    """แปลง NaN / numpy scalar ให้เป็นค่าที่ส่งเป็น JSON ได้"""
    if value is None:
        return None
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def rnd(value, digits: int = 2):
    value = clean(value)
    return None if value is None else round(float(value), digits)


def ratio(numerator, denominator, scale: float = 1.0):
    numerator, denominator = clean(numerator), clean(denominator)
    if numerator is None or not denominator:
        return None
    return numerator / denominator * scale


def first_row(frame: pd.DataFrame, labels: list[str], column) -> float | None:
    """ค่าจากแถวแรกที่มีข้อมูล (ชื่อแถวของ Yahoo ต่างกันตามประเภทธุรกิจ)"""
    for label in labels:
        if label in frame.index:
            value = clean(frame.at[label, column])
            if value is not None:
                return value
    return None


def dividends_by_fiscal_year(dividends: pd.Series) -> dict[int, float]:
    """รวมปันผลตามปีผลประกอบการ: XD ครึ่งปีหลัง = งวดระหว่างกาลของปีนั้น, ครึ่งปีแรก = งวดสุดท้ายของปีก่อน"""
    totals: dict[int, float] = {}
    for ex_date, amount in dividends.items():
        year = ex_date.year if ex_date.month >= INTERIM_FROM_MONTH else ex_date.year - 1
        totals[year] = totals.get(year, 0.0) + float(amount)
    return totals


def build_financials(symbol: str, ticker: yf.Ticker, prices: pd.DataFrame) -> list[dict]:
    income, balance = ticker.income_stmt, ticker.balance_sheet
    dps = dividends_by_fiscal_year(ticker.dividends)
    year_close = prices["Close"].groupby(prices.index.year).last()

    rows = []
    for column in sorted(income.columns):
        year = column.year
        revenue = first_row(income, ["Total Revenue", "Operating Revenue"], column)
        net_profit = first_row(income, ["Net Income Common Stockholders", "Net Income"], column)
        if revenue is None or net_profit is None:
            continue
        has_balance = column in balance.columns
        equity = first_row(balance, ["Stockholders Equity", "Common Stock Equity"], column) if has_balance else None
        liabilities = first_row(balance, ["Total Liabilities Net Minority Interest"], column) if has_balance else None
        eps = first_row(income, ["Basic EPS", "Diluted EPS"], column)

        rows.append({
            "symbol": symbol,
            "year": year,
            "close_price": rnd(year_close.get(year)),
            # ปีล่าสุดอาจยังจ่ายปันผลไม่ครบ (งวดสุดท้ายจ่ายปีถัดไป)
            "dividend_per_share": rnd(dps.get(year, 0.0), 4),
            "revenue": rnd(revenue / MILLION),
            "expenses": rnd((revenue - net_profit) / MILLION),
            "net_profit": rnd(net_profit / MILLION),
            "eps": rnd(eps, 4),
            "roe": rnd(ratio(net_profit, equity, 100)),
            "net_profit_margin": rnd(ratio(net_profit, revenue, 100)),
            "de": rnd(ratio(liabilities, equity)),
            "total_equity": rnd(equity / MILLION if equity is not None else None),
            "total_liabilities": rnd(liabilities / MILLION if liabilities is not None else None),
        })
    return rows


def build_prices(symbol: str, prices: pd.DataFrame) -> list[dict]:
    return [
        {
            "symbol": symbol,
            "date": index.date().isoformat(),
            "open": rnd(row["Open"], 4),
            "high": rnd(row["High"], 4),
            "low": rnd(row["Low"], 4),
            "close": rnd(row["Close"], 4),
            "adj_close": rnd(row["Adj Close"], 4),
            "volume": None if clean(row["Volume"]) is None else int(row["Volume"]),
        }
        for index, row in prices.iterrows()
        if clean(row["Close"]) is not None
    ]


def build_stock(symbol: str, sector: str, ticker: yf.Ticker, prices: pd.DataFrame, financials: list[dict]) -> dict:
    info = ticker.info
    latest = financials[-1] if financials else {}
    price = clean(info.get("currentPrice")) or clean(info.get("regularMarketPrice")) or clean(prices["Close"].iloc[-1])
    shares = clean(info.get("sharesOutstanding"))
    equity = latest.get("total_equity")
    # ปันผลปีล่าสุดที่จ่ายครบแล้ว (ปีปัจจุบันยังมีแค่งวดระหว่างกาล)
    full_years = [row for row in financials if row["year"] < datetime.now().year]
    last_dps = full_years[-1]["dividend_per_share"] if full_years else None

    return {
        "symbol": symbol,
        "yahoo_symbol": ticker.ticker,
        "name": info.get("longName") or info.get("shortName") or symbol,
        "sector": sector,
        "industry": info.get("industry"),
        "currency": info.get("currency") or "THB",
        "shares_outstanding": rnd(ratio(shares, MILLION)),
        "price": rnd(price),
        "pe": rnd(info.get("trailingPE")) or rnd(ratio(price, latest.get("eps"))),
        "pbv": rnd(info.get("priceToBook")) or rnd(ratio(price * shares / MILLION if shares else None, equity)),
        "dividend_yield": rnd(ratio(last_dps, price, 100)),
        "roe": latest.get("roe"),
        "de": latest.get("de"),
        "market_cap": rnd(ratio(clean(info.get("marketCap")), MILLION), 0),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch(symbol: str, sector: str, period: str) -> dict:
    ticker = yf.Ticker(f"{symbol}.BK")
    prices = ticker.history(period=period, auto_adjust=False)
    if prices.empty:
        raise RuntimeError("ไม่พบราคาจาก Yahoo Finance")
    financials = build_financials(symbol, ticker, prices)
    return {
        "stock": build_stock(symbol, sector, ticker, prices, financials),
        "financials": financials,
        "prices": build_prices(symbol, prices),
    }


def save(client, data: dict) -> None:
    # stocks ก่อน เพราะอีกสองตารางอ้างอิง foreign key ไปที่ stocks.symbol
    client.table("stocks").upsert(data["stock"]).execute()
    if data["financials"]:
        client.table("stock_financials").upsert(data["financials"]).execute()
    prices = data["prices"]
    for start in range(0, len(prices), PRICE_BATCH):
        client.table("stock_prices").upsert(prices[start:start + PRICE_BATCH]).execute()


def main() -> int:
    # คอนโซล Windows ค่าเริ่มต้นไม่ใช่ UTF-8 — ป้องกันข้อความภาษาไทยพัง
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="ดึงข้อมูลหุ้นไทยจาก yfinance แล้ว upsert เข้า Supabase")
    parser.add_argument("--symbols", nargs="+", type=str.upper, default=list(STOCKS), help="ชื่อย่อ SET เช่น PTT KBANK")
    parser.add_argument("--period", default="6y", help="ช่วงราคาย้อนหลังของ yfinance (ค่าเริ่มต้น 6y ให้ครอบคลุมงบ 5 ปี)")
    parser.add_argument("--dry-run", action="store_true", help="ไม่เขียน Supabase")
    parser.add_argument("--out", type=Path, help="บันทึกผลเป็นไฟล์ JSON")
    args = parser.parse_args()

    client = None
    if not args.dry_run:
        load_dotenv(ROOT / ".env.local")
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY")
        if not url or not key:
            print("✗ ไม่พบ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY ใน .env.local (หรือใช้ --dry-run)", file=sys.stderr)
            return 1
        from supabase import create_client
        client = create_client(url, key)

    results, failed = [], []
    for symbol in args.symbols:
        try:
            data = fetch(symbol, STOCKS.get(symbol, "Other"), args.period)
            if client:
                save(client, data)
            results.append(data)
            stock = data["stock"]
            print(
                f"✓ {symbol:<7} ราคา {stock['price']} | P/E {stock['pe']} | P/BV {stock['pbv']} | "
                f"Yield {stock['dividend_yield']}% | งบ {len(data['financials'])} ปี | ราคา {len(data['prices'])} วัน"
            )
        except Exception as error:  # หุ้นตัวเดียวพังไม่ควรหยุดทั้งรอบ
            failed.append(symbol)
            print(f"✗ {symbol:<7} {error}", file=sys.stderr)

    if args.out:
        args.out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"บันทึก JSON ที่ {args.out}")

    target = "dry-run (ไม่ได้เขียน Supabase)" if args.dry_run else "เขียนเข้า Supabase แล้ว"
    print(f"\nสำเร็จ {len(results)}/{len(args.symbols)} ตัว — {target}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
