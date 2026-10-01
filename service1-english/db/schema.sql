-- PostgreSQL schema for the English corporate site
-- Shared by the desktop (/web) and mobile (/m) front ends.

CREATE TABLE IF NOT EXISTS site_settings (
  key         VARCHAR(64) PRIMARY KEY,
  value       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(64) UNIQUE NOT NULL,
  title       VARCHAR(200) NOT NULL,
  summary     TEXT,
  body        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id          SERIAL PRIMARY KEY,
  year        INTEGER NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(80) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  icon        VARCHAR(16),
  summary     TEXT NOT NULL,
  body        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(80) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  slug        VARCHAR(80) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  model_no    VARCHAR(80),
  summary     TEXT NOT NULL,
  body        TEXT NOT NULL,
  specs       JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS news (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(120) UNIQUE NOT NULL,
  title        VARCHAR(300) NOT NULL,
  summary      TEXT NOT NULL,
  body         TEXT NOT NULL,
  published_at DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);

CREATE TABLE IF NOT EXISTS faqs (
  id          SERIAL PRIMARY KEY,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inquiries (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(200) NOT NULL,
  company     VARCHAR(200),
  phone       VARCHAR(60),
  subject     VARCHAR(200),
  message     TEXT NOT NULL,
  source      VARCHAR(10) NOT NULL CHECK (source IN ('web', 'mobile')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
