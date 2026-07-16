#!/usr/bin/env python3
"""以本機伺服器開啟驛品香生態農園靜態網站。"""
import webbrowser
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading

DIR = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(DIR), **k)

httpd = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
url = "http://127.0.0.1:8765/index.html"
webbrowser.open(url)
print(f"已開啟：{url}\n按 Ctrl+C 結束")
try:
    threading.Event().wait()
except KeyboardInterrupt:
    httpd.shutdown()
