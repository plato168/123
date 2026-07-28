# 個股 52 週高點比對工具

解析自選列表 HTML，計算每檔股票現價相對 52 週高點的差距百分比，並產生視覺化 HTML 報告。

## 安裝

```bash
pip install -r requirements.txt
```

## 使用方式

```bash
python stock_52w_compare.py 你的自選列表.html
```

常用選項：

- `-o report.html`：指定輸出報告檔名（預設 `stock_52w_report.html`）
- `--console`：同時在終端機印出文字表格
- `--offline`：僅使用 HTML 內建的 52 週高點，不連線查詢 Yahoo Finance

範例：

```bash
python stock_52w_compare.py sample_watchlist.html --console
```

## HTML 格式支援

程式會從 HTML 表格解析個股，支援以下欄位：

| 欄位 | 說明 |
|------|------|
| `data-symbol` | 股票代號（如 `ASML`、`BRK B`） |
| `data-exchange` | 交易所（選填） |
| `data-52w-high` | 52 週高點（選填，若無則自動查詢） |
| `最後` / `Last` 欄 | 現價 |

若 HTML 未提供 52 週高點，程式會透過 Yahoo Finance 自動補齊。

## 計算公式

```
距高點% = (現價 − 52週高點) ÷ 52週高點 × 100
```

數值越接近 0 代表越靠近一年高點；負值代表現價低於 52 週高點。
