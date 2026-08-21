CREATE TABLE IF NOT EXISTS telegram_report_profiles (
  report_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO telegram_report_profiles(report_key,title,fields_json,updated_by)
VALUES
  ('product','ÃœrÃ¼n performans raporu','["period_quantity","period_revenue","top_customers","fifo_profit","margin","category_share"]','system_default'),
  ('customer','Cari raporu','["cari_unvan","sinif","acik_bakiye","cek_senet_bakiyesi","bakiye_guncelleme"]','system_default');
