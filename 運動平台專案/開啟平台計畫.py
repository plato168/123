#!/usr/bin/env python3
from pathlib import Path
import webbrowser

INDEX = Path(__file__).resolve().parent / "index.html"
webbrowser.open(INDEX.as_uri())
print(f"已開啟：{INDEX}")
