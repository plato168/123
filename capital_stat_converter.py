#!/usr/bin/env python3
"""將 Capital Stat PDF 轉換為結構化 HTML 與 CSV 檔案。"""

from __future__ import annotations

import argparse
import csv
import re
from dataclasses import dataclass, field
from datetime import datetime
from html import escape
from pathlib import Path
from typing import Any

import pdfplumber


ASSET_HEADERS = [
    "Cathay",
    "BOT",
    "FUBON",
    "TWN-Stock",
    "IBKR",
    "Loan_Repaid",
    "Sum",
    "Total_Assets",
    "Original_Capital",
    "Capital_Gain",
    "Deposits",
    "Realized_Gain",
    "IBKR_US",
    "USD_TWD",
    "Cathay_Loan",
    "Cathay_Loan_Balance",
    "Date",
    "CASH",
    "Note",
    "TSM",
]

ASSET_HEADERS_ZH = {
    "Cathay": "國泰",
    "BOT": "台銀",
    "FUBON": "富邦",
    "TWN-Stock": "台股",
    "IBKR": "IBKR",
    "Loan_Repaid": "貸款已還",
    "Sum": "合計",
    "Total_Assets": "資產總額",
    "Original_Capital": "原始資本",
    "Capital_Gain": "資本增值",
    "Deposits": "期間存入款",
    "Realized_Gain": "實際投資獲利",
    "IBKR_US": "IBKR-US",
    "USD_TWD": "USD/TWD",
    "Cathay_Loan": "國泰貸款",
    "Cathay_Loan_Balance": "國泰貸款餘額",
    "Date": "日期",
    "CASH": "現金",
    "Note": "備註",
    "TSM": "TSM",
}

TX_HEADERS = [
    "Section",
    "Trade_Date",
    "Account_Date",
    "Description",
    "Withdrawal",
    "Deposit",
    "Balance",
    "Transaction_Info",
    "Note",
]

TX_HEADERS_ZH = {
    "Section": "帳戶區段",
    "Trade_Date": "交易日期",
    "Account_Date": "帳務日期",
    "Description": "說明",
    "Withdrawal": "提出",
    "Deposit": "存入",
    "Balance": "餘額",
    "Transaction_Info": "交易資訊",
    "Note": "備註",
}

DATE_RE = re.compile(r"\d{4}/\d{1,2}/\d{1,2}")
SUMMARY_RE = re.compile(r"總金額\s*TWD")
SECTION_NAMES = ["國泰 Cathay", "台銀 BOT", "富邦 FUBON"]


@dataclass
class AssetRow:
    values: dict[str, str] = field(default_factory=dict)


@dataclass
class TransactionRow:
    section: str
    trade_date: str
    account_date: str
    description: str
    withdrawal: str
    deposit: str
    balance: str
    transaction_info: str
    note: str


def clean_cell(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ").strip()
    return re.sub(r"\s+", " ", text)


def is_date_cell(text: str) -> bool:
    return bool(DATE_RE.search(text))


def is_transaction_header(row: list[Any]) -> bool:
    cells = [clean_cell(c) for c in row[:3]]
    return cells[0] == "交易日期" and cells[1] == "帳務日期"


def is_summary_row(row: list[Any]) -> bool:
    joined = " ".join(clean_cell(c) for c in row if c)
    return "總金額" in joined and "TWD" in joined


def is_transaction_data_row(row: list[Any]) -> bool:
    if not row:
        return False
    first = clean_cell(row[0])
    if not first or first in {"提出", "存入"}:
        return False
    if is_transaction_header(row) or is_summary_row(row):
        return False
    return is_date_cell(first)


def normalize_asset_headers(raw_headers: list[Any]) -> list[str]:
    headers: list[str] = []
    used: dict[str, int] = {}
    mapping = {
        "(+貸款已還款項)": "Loan_Repaid",
        "(存款增加+投資獲利)": "Capital_Gain",
        "ORGINAL CAPITAL": "Original_Capital",
        "資產總額": "Total_Assets",
        "期間存入款": "Deposits",
        "實際投資獲利": "Realized_Gain",
        "Cathay Loan": "Cathay_Loan",
        "Cathay loan balance": "Cathay_Loan_Balance",
        "USD-TWD": "USD_TWD",
        "IBKR-US": "IBKR_US",
        "TWN-Stock": "TWN-Stock",
    }

    for cell in raw_headers:
        text = clean_cell(cell)
        if not text:
            headers.append("")
            continue
        key = mapping.get(text, text.replace(" ", "_"))
        if key in used:
            used[key] += 1
            key = f"{key}_{used[key]}"
        else:
            used[key] = 0
        headers.append(key)

    # 對齊預設欄位名稱
    normalized: list[str] = []
    for idx, header in enumerate(headers):
        if header:
            normalized.append(header)
        elif idx < len(ASSET_HEADERS):
            normalized.append(ASSET_HEADERS[idx])
        else:
            normalized.append(f"Extra_{idx}")
    return normalized[: len(ASSET_HEADERS)]


def parse_assets(page: pdfplumber.page.Page) -> list[AssetRow]:
    tables = page.extract_tables() or []
    if not tables:
        return []

    table = tables[0]
    if not table:
        return []

    headers = normalize_asset_headers(table[0])
    rows: list[AssetRow] = []

    for raw in table[1:]:
        cells = [clean_cell(c) for c in raw]
        if not any(cells):
            continue
        if cells[0] in {"Cathay", "交易日期"}:
            continue
        if all(not DATE_RE.search(c) and not re.search(r"\d", c) for c in cells):
            continue

        values: dict[str, str] = {}
        for idx, header in enumerate(headers):
            if idx >= len(cells):
                break
            value = cells[idx]
            if value:
                values[header] = value

        # 將散落備註欄合併
        note_parts = [cells[i] for i in range(len(headers), len(cells)) if clean_cell(cells[i])]
        if note_parts:
            existing = values.get("Note", "")
            values["Note"] = " ".join(part for part in [existing, *note_parts] if part).strip()

        if values.get("Cathay") or values.get("Date") or values.get("Total_Assets"):
            rows.append(AssetRow(values=values))

    return rows


def parse_transactions(pdf: pdfplumber.PDF) -> list[TransactionRow]:
    rows: list[TransactionRow] = []
    seen: set[tuple[str, ...]] = set()
    section_idx = 0
    current_section = SECTION_NAMES[0]

    for page_num, page in enumerate(pdf.pages[1:], start=2):
        for table in page.extract_tables() or []:
            for raw in table:
                if is_transaction_header(raw):
                    if page_num > 2 and rows:
                        section_idx = min(section_idx + 1, len(SECTION_NAMES) - 1)
                        current_section = SECTION_NAMES[section_idx]
                    continue
                if is_summary_row(raw):
                    continue
                if not is_transaction_data_row(raw):
                    continue

                cells = [clean_cell(c) for c in raw] + [""] * 8
                key = tuple(cells[:8])
                if key in seen:
                    continue
                seen.add(key)

                rows.append(
                    TransactionRow(
                        section=current_section,
                        trade_date=cells[0],
                        account_date=cells[1],
                        description=cells[2],
                        withdrawal=cells[3],
                        deposit=cells[4],
                        balance=cells[5],
                        transaction_info=cells[6],
                        note=cells[7],
                    )
                )
    return rows


def write_assets_csv(rows: list[AssetRow], path: Path) -> None:
    fieldnames = ASSET_HEADERS
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writerow({key: ASSET_HEADERS_ZH.get(key, key) for key in fieldnames})
        for row in rows:
            writer.writerow({key: row.values.get(key, "") for key in fieldnames})


def write_transactions_csv(rows: list[TransactionRow], path: Path) -> None:
    fieldnames = TX_HEADERS
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writerow({key: TX_HEADERS_ZH.get(key, key) for key in fieldnames})
        for row in rows:
            writer.writerow(
                {
                    "Section": row.section,
                    "Trade_Date": row.trade_date,
                    "Account_Date": row.account_date,
                    "Description": row.description,
                    "Withdrawal": row.withdrawal,
                    "Deposit": row.deposit,
                    "Balance": row.balance,
                    "Transaction_Info": row.transaction_info,
                    "Note": row.note,
                }
            )


def fmt_money(value: str) -> str:
    if not value or value == "−":
        return "—"
    return value


def render_assets_table(rows: list[AssetRow]) -> str:
    if not rows:
        return "<p>無資產資料</p>"

    display_cols = [
        "Date",
        "Cathay",
        "BOT",
        "FUBON",
        "TWN-Stock",
        "IBKR",
        "Total_Assets",
        "Realized_Gain",
        "USD_TWD",
        "CASH",
        "TSM",
        "Note",
    ]

    head = "".join(f"<th>{escape(ASSET_HEADERS_ZH.get(col, col))}</th>" for col in display_cols)
    body_rows = []
    for row in rows:
        cells = "".join(
            f"<td class='{'num' if col not in {'Date', 'Note'} else ''}'>{escape(fmt_money(row.values.get(col, '')))}</td>"
            for col in display_cols
        )
        body_rows.append(f"<tr>{cells}</tr>")

    return f"""
    <section id="assets">
      <h2>資產快照</h2>
      <div class="table-wrap">
        <table>
          <thead><tr>{head}</tr></thead>
          <tbody>{''.join(body_rows)}</tbody>
        </table>
      </div>
    </section>
    """


def render_transactions_table(rows: list[TransactionRow]) -> str:
    if not rows:
        return "<p>無交易資料</p>"

    sections: dict[str, list[TransactionRow]] = {}
    for row in rows:
        sections.setdefault(row.section, []).append(row)

    parts = ['<section id="transactions"><h2>銀行交易明細</h2>']
    for section, section_rows in sections.items():
        head = "".join(f"<th>{escape(TX_HEADERS_ZH[h])}</th>" for h in TX_HEADERS[1:])
        body = []
        for row in section_rows[:200]:
            body.append(
                "<tr>"
                f"<td>{escape(row.trade_date)}</td>"
                f"<td>{escape(row.account_date)}</td>"
                f"<td>{escape(row.description)}</td>"
                f"<td class='num debit'>{escape(fmt_money(row.withdrawal))}</td>"
                f"<td class='num credit'>{escape(fmt_money(row.deposit))}</td>"
                f"<td class='num'>{escape(fmt_money(row.balance))}</td>"
                f"<td class='small'>{escape(row.transaction_info)}</td>"
                f"<td class='small'>{escape(row.note)}</td>"
                "</tr>"
            )
        more = ""
        if len(section_rows) > 200:
            more = f"<p class='meta'>僅顯示前 200 筆，完整資料請見 CSV（共 {len(section_rows)} 筆）</p>"
        parts.append(
            f"""
            <h3>{escape(section)} <span class='badge'>{len(section_rows)} 筆</span></h3>
            {more}
            <div class="table-wrap">
              <table>
                <thead><tr>{head}</tr></thead>
                <tbody>{''.join(body)}</tbody>
              </table>
            </div>
            """
        )
    parts.append("</section>")
    return "\n".join(parts)


def render_summary(assets: list[AssetRow], transactions: list[TransactionRow]) -> str:
    latest = assets[-1].values if assets else {}
    latest_total = latest.get("Total_Assets", "—")
    latest_gain = latest.get("Realized_Gain", "—")
    latest_date = latest.get("Date", "—")

    return f"""
    <section class="summary-cards">
      <div class="card">
        <div class="label">最新資產總額</div>
        <div class="value">{escape(latest_total)}</div>
        <div class="sub">日期：{escape(latest_date)}</div>
      </div>
      <div class="card">
        <div class="label">實際投資獲利</div>
        <div class="value gain">{escape(latest_gain)}</div>
        <div class="sub">相對原始資本</div>
      </div>
      <div class="card">
        <div class="label">交易筆數</div>
        <div class="value">{len(transactions)}</div>
        <div class="sub">跨帳戶彙整</div>
      </div>
      <div class="card">
        <div class="label">資產快照筆數</div>
        <div class="value">{len(assets)}</div>
        <div class="sub">歷史紀錄</div>
      </div>
    </section>
    """


def render_html(assets: list[AssetRow], transactions: list[TransactionRow], source: Path) -> str:
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capital Stat 資產報表</title>
  <style>
    :root {{
      --bg: #0b1220;
      --panel: #121b2d;
      --panel-2: #182338;
      --text: #e8eef8;
      --muted: #8fa1bb;
      --border: #2a3850;
      --accent: #4f8cff;
      --gain: #34d399;
      --loss: #f87171;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", "Noto Sans TC", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }}
    .wrap {{ max-width: 1400px; margin: 0 auto; padding: 24px 16px 56px; }}
    h1 {{ margin: 0 0 8px; font-size: 1.8rem; }}
    h2 {{ margin: 32px 0 12px; font-size: 1.25rem; }}
    h3 {{ margin: 24px 0 10px; font-size: 1.05rem; color: var(--muted); }}
    .meta {{ color: var(--muted); margin-bottom: 20px; }}
    .summary-cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin: 20px 0 28px;
    }}
    .card {{
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 18px;
    }}
    .card .label {{ color: var(--muted); font-size: 0.85rem; }}
    .card .value {{ font-size: 1.5rem; font-weight: 700; margin-top: 6px; }}
    .card .value.gain {{ color: var(--gain); }}
    .card .sub {{ color: var(--muted); font-size: 0.82rem; margin-top: 4px; }}
    .badge {{
      display: inline-block;
      background: rgba(79, 140, 255, 0.15);
      color: var(--accent);
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 0.8rem;
      margin-left: 8px;
    }}
    .table-wrap {{
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
    }}
    table {{ width: 100%; border-collapse: collapse; min-width: 900px; }}
    th, td {{ padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }}
    th {{
      position: sticky;
      top: 0;
      background: #101827;
      color: var(--muted);
      font-size: 0.82rem;
      white-space: nowrap;
    }}
    tr:hover td {{ background: rgba(79, 140, 255, 0.05); }}
    .num {{ font-variant-numeric: tabular-nums; white-space: nowrap; }}
    .debit {{ color: var(--loss); }}
    .credit {{ color: var(--gain); }}
    .small {{ font-size: 0.82rem; color: var(--muted); max-width: 220px; word-break: break-all; }}
    .footer {{ margin-top: 28px; color: var(--muted); font-size: 0.9rem; }}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Capital Stat 資產報表</h1>
    <p class="meta">來源：{escape(source.name)}　|　產生時間：{generated}</p>
    {render_summary(assets, transactions)}
    {render_assets_table(assets)}
    {render_transactions_table(transactions)}
    <p class="footer">完整資料已同步輸出為 CSV：capital_assets.csv、capital_transactions.csv</p>
  </div>
</body>
</html>
"""


def convert_pdf(input_pdf: Path, output_dir: Path) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    with pdfplumber.open(input_pdf) as pdf:
        assets = parse_assets(pdf.pages[0])
        transactions = parse_transactions(pdf)

    assets_csv = output_dir / "capital_assets.csv"
    tx_csv = output_dir / "capital_transactions.csv"
    html_path = output_dir / "capital_stat.html"

    write_assets_csv(assets, assets_csv)
    write_transactions_csv(transactions, tx_csv)
    html_path.write_text(render_html(assets, transactions, input_pdf), encoding="utf-8")

    return {
        "assets_csv": assets_csv,
        "transactions_csv": tx_csv,
        "html": html_path,
        "asset_rows": assets,
        "transaction_rows": transactions,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="將 Capital Stat PDF 轉為 HTML 與 CSV")
    parser.add_argument("input_pdf", type=Path, help="Capital Stat PDF 路徑")
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=Path("capital_output"),
        help="輸出資料夾（預設 capital_output）",
    )
    args = parser.parse_args()

    if not args.input_pdf.exists():
        raise SystemExit(f"找不到檔案：{args.input_pdf}")

    result = convert_pdf(args.input_pdf, args.output_dir)
    print(f"資產快照：{len(result['asset_rows'])} 筆 -> {result['assets_csv']}")
    print(f"交易明細：{len(result['transaction_rows'])} 筆 -> {result['transactions_csv']}")
    print(f"HTML 報表：{result['html']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
