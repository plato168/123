#!/usr/bin/env python3
"""
同步 運動營養餐食範例.json → 運動營養健康飲食建議指南.html
用法：python3 更新運動營養指南.py [--open]
"""
from __future__ import annotations

import argparse
import json
import re
import webbrowser
from datetime import date
from pathlib import Path

DIR = Path(__file__).resolve().parent
JSON_PATH = DIR / "運動營養餐食範例.json"
HTML_PATH = DIR / "運動營養健康飲食建議指南.html"
MARK_BEGIN = "<!-- NUTRITION_DATA_BEGIN -->"
MARK_END = "<!-- NUTRITION_DATA_END -->"


def sync_html(data: dict) -> None:
    data["updated"] = date.today().isoformat()
    html = HTML_PATH.read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    block = (
        f"{MARK_BEGIN}\n"
        f'<script type="application/json" id="nutrition-data">\n{payload}\n</script>\n'
        f"{MARK_END}"
    )
    pattern = re.compile(re.escape(MARK_BEGIN) + r".*?" + re.escape(MARK_END), re.DOTALL)
    if not pattern.search(html):
        raise SystemExit(f"找不到資料標記，請確認 {HTML_PATH.name} 格式")
    HTML_PATH.write_text(pattern.sub(block, html), encoding="utf-8")
    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="同步運動營養 JSON 至 HTML")
    parser.add_argument("--open", action="store_true", help="更新後開啟瀏覽器")
    args = parser.parse_args()

    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    sync_html(data)
    print(f"已更新：{JSON_PATH.name}、{HTML_PATH.name}（{data['updated']}）")
    if args.open:
        webbrowser.open(HTML_PATH.as_uri())
        print(f"已開啟：{HTML_PATH}")


if __name__ == "__main__":
    main()
