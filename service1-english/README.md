# service1-english — 英文企業網站（網頁版 / 手機版 分離入口）

仿 `service1.com.tw/english` 架構開發的英文企業網站。**網頁版**與**手機版**各有自己的入口與介面，
共用同一組 API 與 **PostgreSQL** 資料庫。

> 註：開發環境無法連線至原網站，因此頁面架構採一般企業英文站結構
> （Home / About Us / Services / Products / News / FAQ / Contact Us），
> 公司名稱、文字、產品皆為**示範用假資料**，請改成貴公司實際內容（修改 `db/seed.sql` 或直接改資料庫）。

## 入口連結

| 入口 | 網址 | 說明 |
|---|---|---|
| 自動判斷 | `http://localhost:3000/` | 依 User-Agent 自動導向：手機 → `/m/`，電腦 → `/web/` |
| **網頁版** | `http://localhost:3000/web/` | 桌機版：頂部下拉選單、側欄、多欄頁尾 |
| **手機版** | `http://localhost:3000/m/` | App 風格：側滑選單、底部分頁列、一鍵撥號 / Email / 地圖 |
| 強制切換 | `/?view=web`、`/?view=mobile` | 兩版頁面上也都有「切換版本」連結 |

兩版共用相同的頁面路由（hash），例如 `/web/#/products/sx-100` ↔ `/m/#/products/sx-100`。

## 目錄結構

```
service1-english/
├── db/
│   ├── schema.sql        # PostgreSQL 資料表
│   └── seed.sql          # 示範資料
├── server/
│   ├── index.js          # Express：入口導向 + 靜態檔 + REST API
│   └── db.js             # pg 連線池
├── scripts/init-db.js    # 建表 + 匯入資料
├── public/
│   ├── shared/api.js     # 兩版共用：API 呼叫、路由、表單送出
│   ├── web/              # 網頁版（index.html / app.js / style.css）
│   └── mobile/           # 手機版（index.html / app.js / style.css）
├── docker-compose.yml    # PostgreSQL 16 + Node 一鍵啟動
└── .env.example
```

## 啟動方式

### 方式一：Docker（最簡單）

```bash
cd service1-english
docker compose up
```
開啟 http://localhost:3000/ 。資料庫會在第一次啟動時自動建表並匯入示範資料。

### 方式二：本機 Node.js + PostgreSQL

```bash
cd service1-english
cp .env.example .env            # 修改 DATABASE_URL
createuser -P service1          # 密碼 service1（或自訂並改 .env）
createdb -O service1 service1_english
npm install
npm run db:init                 # 建表 + 匯入示範資料（npm run db:reset 會先刪表重建）
npm start
```

需求：Node.js 18+、PostgreSQL 13+（已用 PostgreSQL 16 測試）。

## 資料表

| 資料表 | 用途 |
|---|---|
| `site_settings` | 公司名稱、標語、電話、傳真、Email、地址、營業時間 |
| `pages` | 首頁主視覺、About、Mission、Quality Policy 等文字頁 |
| `milestones` | 公司沿革 |
| `services` | 服務項目 |
| `product_categories` / `products` | 產品分類 / 產品（規格存在 `specs` JSONB） |
| `news` | 最新消息 |
| `faqs` | 常見問題 |
| `inquiries` | 聯絡表單留言（`source` 欄位記錄來自 `web` 或 `mobile`） |

## API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/health` | 健康檢查（含 DB） |
| GET | `/api/site` | 網站設定 |
| GET | `/api/pages/:slug` | 單一文字頁 |
| GET | `/api/milestones` | 沿革 |
| GET | `/api/services`、`/api/services/:slug` | 服務 |
| GET | `/api/categories` | 產品分類（含數量） |
| GET | `/api/products?category=slug`、`/api/products/:slug` | 產品 |
| GET | `/api/news?limit=n`、`/api/news/:slug` | 消息 |
| GET | `/api/faqs` | FAQ |
| POST | `/api/contact` | 送出聯絡表單 `{name, email, message, company?, phone?, subject?, source}` |

查看留言：
```sql
SELECT created_at, source, name, email, subject, message FROM inquiries ORDER BY created_at DESC;
```
