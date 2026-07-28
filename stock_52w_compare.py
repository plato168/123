#!/usr/bin/env python3
"""解析自選列表 HTML，比對現價與 52 週高點的差距百分比。"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from bs4 import BeautifulSoup, Tag
import yfinance as yf


# 非個股代號，略過不查詢
SKIP_SYMBOLS = {
    "USD.JPY",
    "EUR.USD",
    "GBP.USD",
}


@dataclass
class StockRow:
    symbol: str
    yahoo_symbol: str
    exchange: str
    current_price: float
    high_52w: float | None = None
    low_52w: float | None = None
    source_52w: str = ""

    @property
    def gap_pct(self) -> float | None:
        if self.high_52w is None or self.high_52w <= 0:
            return None
        return (self.current_price - self.high_52w) / self.high_52w * 100


def normalize_symbol(raw: str) -> str:
    """將 HTML 中的代號轉成 Yahoo Finance 可用格式。"""
    symbol = raw.strip().upper()
    symbol = symbol.replace(" ", "-")
    if symbol == "BRK-B" or raw.strip().upper() == "BRK B":
        return "BRK-B"
    return symbol


def parse_price(text: str) -> float | None:
    cleaned = (
        text.replace(",", "")
        .replace("C", "")
        .replace("$", "")
        .replace("¥", "")
        .strip()
    )
    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not match:
        return None
    try:
        return float(match.group())
    except ValueError:
        return None


def extract_symbol_from_cell(cell: Tag) -> str | None:
    if cell.has_attr("data-symbol"):
        return str(cell["data-symbol"]).strip()

    text = cell.get_text("\n", strip=True)
    if not text:
        return None

    first_line = text.splitlines()[0].strip()
    if re.fullmatch(r"[A-Z0-9][A-Z0-9 .\-]{0,15}", first_line, re.I):
        return first_line
    return None


def find_price_column_index(headers: list[str]) -> int | None:
    keywords = ("最後", "現價", "收盤", "last", "price", "close")
    for idx, header in enumerate(headers):
        header_lower = header.lower()
        if any(keyword in header_lower for keyword in keywords):
            return idx
    return None


def row_has_stock_symbol(row: Tag) -> bool:
    if row.has_attr("data-symbol"):
        return True
    cells = row.find_all(["td", "th"], recursive=False)
    if not cells:
        return False
    return extract_symbol_from_cell(cells[0]) is not None


def parse_table_row(row: Tag, price_col: int | None) -> StockRow | None:
    if row.find("th"):
        return None

    symbol = row.get("data-symbol")
    exchange = str(row.get("data-exchange", "")).strip()
    high_52w = parse_price(str(row.get("data-52w-high", ""))) if row.has_attr("data-52w-high") else None
    low_52w = parse_price(str(row.get("data-52w-low", ""))) if row.has_attr("data-52w-low") else None

    cells = row.find_all(["td", "th"], recursive=False)
    if not cells:
        return None

    if not symbol:
        symbol = extract_symbol_from_cell(cells[0])
    if not symbol:
        return None

    if price_col is None or price_col >= len(cells):
        price_col = len(cells) - 1

    current_price = parse_price(cells[price_col].get_text(" ", strip=True))
    if current_price is None:
        return None

    yahoo_symbol = normalize_symbol(symbol)
    if yahoo_symbol in SKIP_SYMBOLS:
        return None

    return StockRow(
        symbol=symbol.strip(),
        yahoo_symbol=yahoo_symbol,
        exchange=exchange,
        current_price=current_price,
        high_52w=high_52w,
        low_52w=low_52w,
        source_52w="html" if high_52w is not None else "",
    )


def parse_html_table(table: Tag) -> list[StockRow]:
    rows: list[StockRow] = []
    header_cells = table.find("tr")
    headers: list[str] = []
    price_col: int | None = None

    if header_cells:
        headers = [cell.get_text(" ", strip=True) for cell in header_cells.find_all(["th", "td"])]
        price_col = find_price_column_index(headers)

    for row in table.find_all("tr"):
        if row == header_cells:
            continue
        if not row_has_stock_symbol(row):
            continue
        parsed = parse_table_row(row, price_col)
        if parsed:
            rows.append(parsed)
    return rows


def parse_html_lists(soup: BeautifulSoup) -> list[StockRow]:
    rows: list[StockRow] = []
    for item in soup.select("[data-symbol]"):
        if not isinstance(item, Tag):
            continue
        if item.name == "tr":
            continue

        symbol = str(item.get("data-symbol", "")).strip()
        if not symbol:
            continue

        price_text = item.get("data-price") or item.get("data-last")
        current_price = parse_price(str(price_text)) if price_text else None
        if current_price is None:
            price_node = item.select_one("[data-price], .price, .last")
            if price_node:
                current_price = parse_price(price_node.get_text(" ", strip=True))

        if current_price is None:
            continue

        high_52w = parse_price(str(item.get("data-52w-high", ""))) if item.has_attr("data-52w-high") else None
        yahoo_symbol = normalize_symbol(symbol)
        if yahoo_symbol in SKIP_SYMBOLS:
            continue

        rows.append(
            StockRow(
                symbol=symbol,
                yahoo_symbol=yahoo_symbol,
                exchange=str(item.get("data-exchange", "")).strip(),
                current_price=current_price,
                high_52w=high_52w,
                source_52w="html" if high_52w is not None else "",
            )
        )
    return rows


def parse_watchlist_html(html_path: Path) -> list[StockRow]:
    content = html_path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(content, "lxml")

    rows: list[StockRow] = []
    for table in soup.find_all("table"):
        rows.extend(parse_html_table(table))
    rows.extend(parse_html_lists(soup))

    # 以代號去重，保留第一筆
    deduped: dict[str, StockRow] = {}
    for row in rows:
        deduped.setdefault(row.yahoo_symbol, row)
    return list(deduped.values())


def fetch_52w_highs(rows: Iterable[StockRow]) -> None:
    need_fetch = [row for row in rows if row.high_52w is None]
    if not need_fetch:
        return

    symbols = [row.yahoo_symbol for row in need_fetch]
    try:
        tickers = yf.Tickers(" ".join(symbols))
    except Exception as exc:
        print(f"警告：無法批次查詢 Yahoo Finance：{exc}", file=sys.stderr)
        return

    for row in need_fetch:
        try:
            ticker = tickers.tickers.get(row.yahoo_symbol) or yf.Ticker(row.yahoo_symbol)
            info = ticker.fast_info
            high = getattr(info, "year_high", None) or getattr(info, "fifty_two_week_high", None)
            if high is None:
                history = ticker.history(period="1y")
                if not history.empty:
                    high = float(history["High"].max())
            if high is not None and high > 0:
                row.high_52w = float(high)
                row.source_52w = "yahoo"
        except Exception as exc:
            print(f"警告：{row.symbol} ({row.yahoo_symbol}) 查詢失敗：{exc}", file=sys.stderr)


def format_pct(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:+.2f}%"


def render_report(rows: list[StockRow], source_file: Path) -> str:
    sorted_rows = sorted(
        rows,
        key=lambda row: row.gap_pct if row.gap_pct is not None else float("inf"),
    )
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    body_rows = []
    for row in sorted_rows:
        gap = row.gap_pct
        if gap is None:
            gap_class = "unknown"
        elif gap >= -5:
            gap_class = "near-high"
        elif gap >= -20:
            gap_class = "moderate"
        else:
            gap_class = "far"

        high_text = f"{row.high_52w:,.2f}" if row.high_52w is not None else "—"
        body_rows.append(
            f"""
            <tr>
              <td>{row.symbol}</td>
              <td>{row.exchange or "—"}</td>
              <td class="num">{row.current_price:,.2f}</td>
              <td class="num">{high_text}</td>
              <td class="num gap {gap_class}">{format_pct(gap)}</td>
              <td>{row.source_52w or "—"}</td>
            </tr>
            """.strip()
        )

    rows_html = "\n".join(body_rows) if body_rows else '<tr><td colspan="6">未找到任何個股資料</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>52 週高點比對報告</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e8edf5;
      --muted: #8b9cb3;
      --border: #2d3a4d;
      --near: #34d399;
      --moderate: #fbbf24;
      --far: #f87171;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", "Noto Sans TC", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }}
    .wrap {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 1.6rem;
    }}
    .meta {{
      color: var(--muted);
      margin-bottom: 20px;
      font-size: 0.95rem;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }}
    th, td {{
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      text-align: left;
    }}
    th {{
      background: #121a24;
      color: var(--muted);
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}
    tr:last-child td {{ border-bottom: none; }}
    .num {{ font-variant-numeric: tabular-nums; }}
    .gap.near-high {{ color: var(--near); font-weight: 700; }}
    .gap.moderate {{ color: var(--moderate); font-weight: 700; }}
    .gap.far {{ color: var(--far); font-weight: 700; }}
    .gap.unknown {{ color: var(--muted); }}
    .legend {{
      margin-top: 16px;
      color: var(--muted);
      font-size: 0.9rem;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>個股現價 vs 52 週高點</h1>
    <p class="meta">來源檔案：{source_file.name}　|　產生時間：{generated_at}　|　共 {len(rows)} 檔</p>
    <table>
      <thead>
        <tr>
          <th>代號</th>
          <th>交易所</th>
          <th>現價</th>
          <th>52 週高點</th>
          <th>距高點</th>
          <th>高點來源</th>
        </tr>
      </thead>
      <tbody>
        {rows_html}
      </tbody>
    </table>
    <p class="legend">距高點 = (現價 − 52 週高點) ÷ 52 週高點。數值越接近 0 代表越靠近一年高點。</p>
  </div>
</body>
</html>
"""


def print_console_table(rows: list[StockRow]) -> None:
    headers = ["代號", "現價", "52週高", "距高點%"]
    print("\t".join(headers))
    for row in sorted(rows, key=lambda item: item.gap_pct or 0, reverse=True):
        high = f"{row.high_52w:.2f}" if row.high_52w is not None else "—"
        print(f"{row.symbol}\t{row.current_price:.2f}\t{high}\t{format_pct(row.gap_pct)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="比對 HTML 自選列表現價與 52 週高點差距")
    parser.add_argument("input_html", type=Path, help="自選列表 HTML 檔案路徑")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("stock_52w_report.html"),
        help="輸出 HTML 報告路徑（預設：stock_52w_report.html）",
    )
    parser.add_argument(
        "--console",
        action="store_true",
        help="同時在終端機輸出文字表格",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="僅使用 HTML 內建的 52 週高點，不連線查詢",
    )
    args = parser.parse_args()

    if not args.input_html.exists():
        print(f"錯誤：找不到檔案 {args.input_html}", file=sys.stderr)
        return 1

    rows = parse_watchlist_html(args.input_html)
    if not rows:
        print("錯誤：HTML 中未解析到任何個股", file=sys.stderr)
        return 1

    if not args.offline:
        fetch_52w_highs(rows)

    report = render_report(rows, args.input_html)
    args.output.write_text(report, encoding="utf-8")
    print(f"已產生報告：{args.output.resolve()}")

    if args.console:
        print_console_table(rows)

    missing = [row.symbol for row in rows if row.high_52w is None]
    if missing:
        print(f"警告：以下標的缺少 52 週高點資料：{', '.join(missing)}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
