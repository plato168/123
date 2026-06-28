#!/usr/bin/env python3
"""在瀏覽器開啟最新羽球賽事 HTML。"""
from pathlib import Path
import webbrowser

HTML = Path(__file__).resolve().parent / "最新羽球賽事.html"
webbrowser.open(HTML.as_uri())
print(f"已開啟：{HTML}")
