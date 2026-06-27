#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX="$DIR/index.html"

if [[ ! -f "$INDEX" ]]; then
  echo "找不到入口頁：$INDEX" >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  python3 "$DIR/開啟旅遊網頁.py"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$INDEX"
elif command -v open >/dev/null 2>&1; then
  open "$INDEX"
else
  echo "請手動以瀏覽器開啟：file://$INDEX"
  exit 1
fi
