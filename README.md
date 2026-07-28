# 投資工具集

## 1. 個股 52 週高點比對

解析自選列表 HTML，計算每檔股票現價相對 52 週高點的差距百分比，並產生視覺化 HTML 報告。

```bash
python stock_52w_compare.py 你的自選列表.html --console
```

## 2. Capital Stat PDF 轉換

將 Capital Stat 資產統計 PDF 轉換為結構化 HTML 報表與 CSV 檔案。

```bash
python capital_stat_converter.py Capital_Stat.pdf -o capital_output
```

輸出檔案：

| 檔案 | 說明 |
|------|------|
| `capital_stat.html` | 深色主題互動報表（資產快照 + 交易明細） |
| `capital_assets.csv` | 各帳戶資產歷史快照 |
| `capital_transactions.csv` | 銀行交易明細（自動去重） |

## 安裝

```bash
pip install -r requirements.txt
```

## 52 週高點比對 — 詳細說明

常用選項：

- `-o report.html`：指定輸出報告檔名（預設 `stock_52w_report.html`）
- `--console`：同時在終端機印出文字表格
- `--offline`：僅使用 HTML 內建的 52 週高點，不連線查詢 Yahoo Finance

### HTML 格式支援

| 欄位 | 說明 |
|------|------|
| `data-symbol` | 股票代號（如 `ASML`、`BRK B`） |
| `data-exchange` | 交易所（選填） |
| `data-52w-high` | 52 週高點（選填，若無則自動查詢） |
| `最後` / `Last` 欄 | 現價 |

### 計算公式

```
距高點% = (現價 − 52週高點) ÷ 52週高點 × 100
```

數值越接近 0 代表越靠近一年高點；負值代表現價低於 52 週高點。
