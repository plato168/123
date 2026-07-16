# 驛品香生態農園｜靜態 HTML 網站

由原 WordPress 網站 [www.butterfly.idv.tw](https://www.butterfly.idv.tw/) 改寫為純 HTML／CSS 架構，不需 PHP 或資料庫即可部署。

## 頁面對照

| 靜態頁面 | 原 WordPress 路徑 |
|---------|-------------------|
| `index.html` | `/` 首頁 |
| `about.html` | `/index.php/aboutus/` 關於我們 |
| `news.html` | `/index.php/news/` 最新消息 |
| `menu.html` | `/index.php/menu-bookinglink/` 菜單 |
| `camping.html` | `/index.php/camping/` 營區介紹 |
| `diy.html` | `/index.php/diy/` 體驗活動 |
| `gift.html` | `/index.php/gift/` 小農伴手禮 |
| `tent.html` | `/index.php/tent/` 露營裝備租借 |
| `bbq.html` | `/index.php/bbq/` 代訂烤肉食材 |
| `news/*.html` | 最新消息文章 |

## 使用方式

直接以瀏覽器開啟 `index.html`，或將整個資料夾部署至任何靜態主機（GitHub Pages、Nginx、Netlify 等）。

```bash
# 本機預覽（任選）
python3 -m http.server 8080 --directory .
```

## 注意

- 內容依公開網頁與 Wayback Machine 快取整理為繁體中文。
- 線上預約仍導向 BeClass／Facebook；匯款帳號請以官方私訊確認完整號碼。
- 原站「生態微旅行」頁面已不存在，故未收錄。
