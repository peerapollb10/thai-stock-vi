"""
ตรวจผลการดึงหุ้นใน Supabase (อ่านอย่างเดียว)

    .venv\\Scripts\\python scripts/check_fetch.py --hours 2 [--symbols PTT KBANK]

รายงานจำนวนหุ้นทั้งหมด, หุ้นที่อัปเดตภายใน N ชั่วโมง, และหุ้นที่ข้อมูลไม่ครบ
(ไม่มีราคา / ไม่มีงบการเงิน / ราคาย้อนหลังน้อย / ค่า P/E, P/BV ผิดปกติ)
"""

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
MIN_PRICE_DAYS = 200  # --period 2y ควรได้ราว 480 วันทำการ; ต่ำกว่านี้ถือว่าเป็นหุ้นใหม่หรือข้อมูลขาด


def paged(query):
    rows, start = [], 0
    while True:
        batch = query.range(start, start + 999).execute().data
        rows.extend(batch)
        if len(batch) < 1000:
            return rows
        start += 1000


def count(client, table: str, symbol: str) -> int:
    return client.table(table).select("symbol", count="exact", head=True).eq("symbol", symbol).execute().count or 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="ตรวจผลการดึงหุ้นใน Supabase")
    parser.add_argument("--hours", type=float, default=2, help="ตรวจหุ้นที่อัปเดตภายใน N ชั่วโมง")
    parser.add_argument("--symbols", nargs="+", type=str.upper, help="ตรวจเฉพาะชื่อย่อเหล่านี้")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env.local")
    client = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])

    total = client.table("stocks").select("symbol", count="exact", head=True).execute().count
    since = (datetime.now(timezone.utc) - timedelta(hours=args.hours)).isoformat()
    query = client.table("stocks").select("symbol,price,pe,pbv,dividend_yield,market_cap,sector,updated_at")
    query = query.in_("symbol", args.symbols) if args.symbols else query.gte("updated_at", since)
    stocks = paged(query.order("symbol"))

    print(f"หุ้นทั้งหมดใน Supabase: {total} ตัว")
    print(f"หุ้นที่ตรวจ ({'ตามรายชื่อ' if args.symbols else f'อัปเดตภายใน {args.hours:g} ชม.'}): {len(stocks)} ตัว")

    issues = []
    for stock in stocks:
        symbol = stock["symbol"]
        price_days = count(client, "stock_prices", symbol)
        fin_years = count(client, "stock_financials", symbol)
        problems = []
        if not stock["price"] or stock["price"] <= 0:
            problems.append("ไม่มีราคา")
        if fin_years == 0:
            problems.append("ไม่มีงบการเงิน")
        if price_days < MIN_PRICE_DAYS:
            problems.append(f"ราคาย้อนหลัง {price_days} วัน")
        # P/E ติดลบ = ขาดทุน เป็นข้อมูลปกติ; สังเกตเฉพาะค่าสูงผิดปกติ (กำไรเกือบศูนย์)
        if stock["pe"] is not None and stock["pe"] > 500:
            problems.append(f"P/E {stock['pe']}")
        # P/BV ติดลบ = ส่วนของผู้ถือหุ้นติดลบ
        if stock["pbv"] is not None and (stock["pbv"] <= 0 or stock["pbv"] > 100):
            problems.append(f"P/BV {stock['pbv']}")
        if stock["dividend_yield"] is not None and stock["dividend_yield"] > 25:
            problems.append(f"Yield {stock['dividend_yield']}%")
        if problems:
            issues.append(f"{symbol}: {', '.join(problems)}")

    print(f"ข้อมูลครบ/ปกติ: {len(stocks) - len(issues)} ตัว, ต้องสังเกต: {len(issues)} ตัว")
    for line in issues:
        print(f"  - {line}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
