#!/usr/bin/env python3
"""
依日期重新計算賽事狀態，同步 羽球賽事資料.json → 最新羽球賽事.html，並可選擇開啟瀏覽器。
用法：python3 更新羽球賽事.py [--open]
"""
from __future__ import annotations

import argparse
import json
import re
import webbrowser
from datetime import date, datetime
from pathlib import Path

DIR = Path(__file__).resolve().parent
JSON_PATH = DIR / "羽球賽事資料.json"
HTML_PATH = DIR / "最新羽球賽事.html"
MARK_BEGIN = "<!-- TOURNAMENT_DATA_BEGIN -->"
MARK_END = "<!-- TOURNAMENT_DATA_END -->"


def parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def compute_status(start: str, end: str, manual: str) -> str:
    if manual == "tbd":
        return "tbd"
    today = date.today()
    s, e = parse_date(start), parse_date(end)
    if today < s:
        return "upcoming"
    if s <= today <= e:
        return "ongoing"
    return "ended"


def refresh_data(data: dict) -> dict:
    data["updated"] = date.today().isoformat()
    for ev in data.get("events", []):
        ev["status"] = compute_status(ev["start"], ev["end"], ev.get("status", ""))
        if ev["id"].endswith("-tbd") and ev["status"] != "tbd":
            pass
        if "-tbd" in ev["id"]:
            ev["status"] = "tbd"
    return data


def sync_html(data: dict) -> None:
    html = HTML_PATH.read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    block = f"{MARK_BEGIN}\n<script type=\"application/json\" id=\"tournament-data\">\n{payload}\n</script>\n{MARK_END}"
    pattern = re.compile(
        re.escape(MARK_BEGIN) + r".*?" + re.escape(MARK_END),
        re.DOTALL,
    )
    if not pattern.search(html):
        raise SystemExit(f"找不到資料標記，請確認 {HTML_PATH.name} 格式")
    HTML_PATH.write_text(pattern.sub(block, html), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="更新羽球賽事資料並同步 HTML")
    parser.add_argument("--open", action="store_true", help="更新後開啟瀏覽器")
    args = parser.parse_args()

    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    data = refresh_data(data)
    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sync_html(data)
    print(f"已更新：{JSON_PATH.name}、{HTML_PATH.name}（資料日 {data['updated']}）")
    if args.open:
        webbrowser.open(HTML_PATH.as_uri())
        print(f"已開啟：{HTML_PATH}")


if __name__ == "__main__":
    main()
