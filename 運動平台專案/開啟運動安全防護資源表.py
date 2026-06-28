#!/usr/bin/env python3
"""在瀏覽器開啟運動安全防護前中後支援資源表 HTML。"""
import webbrowser
from pathlib import Path

HTML = Path(__file__).resolve().parent / "運動安全防護前中後支援資源表.html"
webbrowser.open(HTML.as_uri())
print(f"已開啟：{HTML}")
