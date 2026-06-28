#!/usr/bin/env python3
"""在瀏覽器開啟運動營養健康飲食建議指南 HTML。"""
from pathlib import Path
import webbrowser

HTML = Path(__file__).resolve().parent / "運動營養健康飲食建議指南.html"
webbrowser.open(HTML.as_uri())
print(f"已開啟：{HTML}")
