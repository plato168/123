#!/usr/bin/env python3
"""執行此腳本後，自動以預設瀏覽器開啟北海道旅遊入口頁。"""

from pathlib import Path
import webbrowser

INDEX = Path(__file__).resolve().parent / "index.html"

if not INDEX.is_file():
    raise SystemExit(f"找不到入口頁：{INDEX}")

webbrowser.open(INDEX.as_uri())
print(f"已開啟：{INDEX}")
