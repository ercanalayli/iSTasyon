PRAGMA foreign_keys = ON;

-- Source catalogue: raw conversations stay at the provider/export layer. AperiON
-- stores provenance and distilled memories, never passwords, OTPs or API keys.
CREATE TABLE IF NOT EXISTS external_conversation_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_updated_at TEXT,
  import_status TEXT NOT NULL DEFAULT 'inventoried'
    CHECK(import_status IN ('inventoried','scanning','partial','complete','blocked','excluded')),
  last_cursor TEXT,
  user_fact_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, external_id)
);

CREATE TABLE IF NOT EXISTS memory_import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  source_scope TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('started','partial','complete','blocked','failed')),
  sources_seen INTEGER NOT NULL DEFAULT 0,
  sources_scanned INTEGER NOT NULL DEFAULT 0,
  candidates_created INTEGER NOT NULL DEFAULT 0,
  memories_accepted INTEGER NOT NULL DEFAULT 0,
  secrets_rejected INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS memory_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_key TEXT NOT NULL UNIQUE,
  source_key TEXT NOT NULL,
  source_turn_id TEXT,
  category TEXT NOT NULL,
  statement TEXT NOT NULL,
  asserted_by TEXT NOT NULL CHECK(asserted_by IN ('user','assistant','system','document')),
  truth_state TEXT NOT NULL
    CHECK(truth_state IN ('user_confirmed','historical_claim','unverified','conflict','rejected')),
  sensitivity TEXT NOT NULL DEFAULT 'private'
    CHECK(sensitivity IN ('company','private','restricted','highly_private','secret')),
  disposition TEXT NOT NULL DEFAULT 'candidate'
    CHECK(disposition IN ('candidate','accepted','rejected','superseded')),
  reason TEXT,
  observed_at TEXT,
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_key) REFERENCES external_conversation_sources(source_key)
);

CREATE INDEX IF NOT EXISTS idx_external_sources_status
  ON external_conversation_sources(provider, import_status, last_scanned_at);
CREATE INDEX IF NOT EXISTS idx_memory_candidates_disposition
  ON memory_candidates(disposition, truth_state, category);

INSERT INTO external_conversation_sources(source_key,provider,external_id,title,import_status,last_scanned_at,notes)
VALUES
  ('chatgpt:6a038382-6d1c-838c-905a-d24a1468e577','chatgpt','6a038382-6d1c-838c-905a-d24a1468e577','Mali müşavirlik ve sistem','partial',datetime('now'),'Kullanıcı beyanları seçilerek tarandı.'),
  ('chatgpt:6a05c659-ff2c-83eb-a6d8-dbcc2f0b4f07','chatgpt','6a05c659-ff2c-83eb-a6d8-dbcc2f0b4f07','Satışlar Konusu','partial',datetime('now'),'Tarihsel rakamlar güncel gerçek sayılmadı.'),
  ('chatgpt:6a057885-e500-83eb-a70b-f0c4b1e3ab6b','chatgpt','6a057885-e500-83eb-a70b-f0c4b1e3ab6b','Finans Yönetimi Rehberi','partial',datetime('now'),'Son sayfa tarandı; eski sayfalar bekliyor.'),
  ('chatgpt:6a04892e-d894-83eb-b8cd-8e41f44d871b','chatgpt','6a04892e-d894-83eb-b8cd-8e41f44d871b','Alaylı İşlemleri','partial',datetime('now'),'Son sayfa tarandı; tarihli bilanço rakamları tarihsel adaydır.'),
  ('chatgpt:6a140c8a-077c-83eb-b36d-491756ee1b81','chatgpt','6a140c8a-077c-83eb-b36d-491756ee1b81','AperiON iSTasyon Gelişimi','partial',datetime('now'),'Uygulama geçmişi; canlı durum sayılmaz.'),
  ('chatgpt:6a2fafd5-94b0-83eb-8295-437442e856f6','chatgpt','6a2fafd5-94b0-83eb-8295-437442e856f6','Moka ALKAM','partial',datetime('now'),'Kaynak önceliği ve mutabakat kuralı tarandı.'),
  ('chatgpt:6a453de7-df54-83eb-b5f7-74b558488abe','chatgpt','6a453de7-df54-83eb-b5f7-74b558488abe','Siparişler ve ödeme düzeni hatırlatması','complete',datetime('now'),'Tek sayfa; kullanıcı mesajı içermiyor.'),
  ('chatgpt:6a45f188-f590-83eb-b9ae-43b9c7647f05','chatgpt','6a45f188-f590-83eb-b9ae-43b9c7647f05','AperiON iSTasyon','inventoried',NULL,NULL),
  ('chatgpt:6a65eb10-df84-83eb-9dd9-894ab0321f2d','chatgpt','6a65eb10-df84-83eb-9dd9-894ab0321f2d','Kelime Havuzu Yönetimi','inventoried',NULL,NULL),
  ('chatgpt:6a311dcc-859c-83eb-8141-52b9ab24a78d','chatgpt','6a311dcc-859c-83eb-8141-52b9ab24a78d','Rapor Merkezi Analizi','inventoried',NULL,NULL),
  ('chatgpt:6a95e0ec-77b4-83eb-90d7-a6974fcd5c23','chatgpt','6a95e0ec-77b4-83eb-90d7-a6974fcd5c23','hermes','inventoried',NULL,NULL),
  ('chatgpt:6a5df6b6-7548-83eb-ac20-d526c7f89a4b','chatgpt','6a5df6b6-7548-83eb-ac20-d526c7f89a4b','KDV Tevkifat Güncellemeleri','inventoried',NULL,NULL),
  ('chatgpt:6a7d8936-fd84-83ed-bba3-6c580f6e6f94','chatgpt','6a7d8936-fd84-83ed-bba3-6c580f6e6f94','Ön Muhasebe Programı','inventoried',NULL,NULL),
  ('chatgpt:6a873abc-b0bc-83eb-83cb-d9d1dbd7de17','chatgpt','6a873abc-b0bc-83eb-83cb-d9d1dbd7de17','AperiON Sabah Protokolü','inventoried',NULL,NULL),
  ('chatgpt:6a883a5b-c260-83ed-aeb0-57cbf9e38da4','chatgpt','6a883a5b-c260-83ed-aeb0-57cbf9e38da4','AperiON Gerçek Operasyon Merkezi','partial',datetime('now'),'Kanıt standardı tarandı.'),
  ('chatgpt:6a85f1a9-dd4c-83eb-bbd7-80aceee6e22f','chatgpt','6a85f1a9-dd4c-83eb-bbd7-80aceee6e22f','AperiON Vizyon Promptu','complete',datetime('now'),'Tek sayfa; vizyon mevcut kullanıcı teyitleriyle birleştirildi.'),
  ('chatgpt:6a829fb5-a7e4-83ed-b05e-466e1e898cc3','chatgpt','6a829fb5-a7e4-83ed-b05e-466e1e898cc3','Günaydın Ege','partial',datetime('now'),'Son sayfa tarandı; kişisel bilgi çıkarılmadı.'),
  ('chatgpt:6a7e253c-645c-83eb-8743-f08aeb1f37a1','chatgpt','6a7e253c-645c-83eb-8743-f08aeb1f37a1','Yapay Zeka Ajanları','inventoried',NULL,NULL)
ON CONFLICT(source_key) DO UPDATE SET
  title=excluded.title,
  import_status=CASE
    WHEN external_conversation_sources.import_status='complete' THEN 'complete'
    ELSE excluded.import_status
  END,
  last_scanned_at=COALESCE(excluded.last_scanned_at,external_conversation_sources.last_scanned_at),
  notes=COALESCE(excluded.notes,external_conversation_sources.notes),
  updated_at=datetime('now');

-- Stable user-confirmed memories. Exact balances and old operational status are
-- deliberately excluded; they must be refreshed from their systems of record.
INSERT INTO memory_items(memory_key,domain_id,memory_type,statement,source_ref,confidence,valid_from,status,updated_at)
VALUES
  ('identity.profession.accountant',(SELECT id FROM life_domains WHERE domain_key='personal'),'identity','Ercan mali müşavirdir.','chatgpt:6a038382-6d1c-838c-905a-d24a1468e577',1.0,'2026-05-14','active',datetime('now')),
  ('aperion.interface.telegram_primary',(SELECT id FROM life_domains WHERE domain_key='aperion'),'standing_rule','AperiON ile günlük iletişimde ana kapı Telegram’daki AperiON Hermes’tir; kullanıcı doğal dille konuşmak, komut ezberlememek ve hızlı yanıt almak ister.','user-confirmed:2026-09-06',1.0,'2026-09-06','active',datetime('now')),
  ('aperion.learning.use_while_improving',(SELECT id FROM life_domains WHERE domain_key='aperion'),'standing_rule','AperiON kullanılabilir çekirdeği hemen sunmalı ve kullanım sırasında kaynaklı hafıza ile gelişmelidir; her işi sıfırdan tek tek öğretme kullanıcıya yüklenmemelidir.','user-confirmed:2026-09-06',1.0,'2026-09-06','active',datetime('now')),
  ('aperion.availability.always_on',(SELECT id FROM life_domains WHERE domain_key='aperion'),'goal','AperiON, işyeri bilgisayarı kapalı olsa da doğrulanmış bulut aynasından 7/24 rapor vermeli; canlı işlem gerektiğinde izinli yerel işçiye yönelmelidir.','user-confirmed:2026-09-06',1.0,'2026-09-06','active',datetime('now')),
  ('aperion.reliability.no_false_success',(SELECT id FROM life_domains WHERE domain_key='aperion'),'standing_rule','Bir işlem yalnız hedef sistemden geri okunmuş kanıtla tamamlandı sayılır; bot mesajı veya eski test sonucu tek başına başarı kanıtı değildir.','chatgpt:6a883a5b-c260-83ed-aeb0-57cbf9e38da4',1.0,'2026-08-20','active',datetime('now')),
  ('finance.scope.life_and_business',(SELECT id FROM life_domains WHERE domain_key='finance'),'preference','Kişisel ve şirket finansı birlikte; kartlar, krediler, banka, cari, faturalar, vergiler, sigorta, abonelikler, araç, ev, aile, sağlık, eğitim, sözleşmeler, vade ve bütçe ihtiyacıyla izlenmelidir.','chatgpt:6a057885-e500-83eb-a70b-f0c4b1e3ab6b',1.0,'2026-05-24','active',datetime('now')),
  ('finance.safety.uncertain_to_review',(SELECT id FROM life_domains WHERE domain_key='finance'),'standing_rule','Belirsiz veya eşleşmeyen finansal kayıt otomatik muhasebeleştirilmez; inceleme/onay akışına alınır ve mükerrerlik kontrol edilir.','chatgpt:6a038382-6d1c-838c-905a-d24a1468e577',1.0,'2026-05-14','active',datetime('now')),
  ('finance.moka.reconciliation_sources',(SELECT id FROM life_domains WHERE domain_key='finance'),'standing_rule','Moka gerçekleşmiş ödemesinde Moka muhasebe/bayiye yatırılan kaydı ana kaynak, banka ekstresi transfer doğrulaması; hesaplanan vade takvimi ise tahmindir. Satırdaki bayiye yatırılan toplam mükerrer toplanmamalıdır.','chatgpt:6a2fafd5-94b0-83eb-8295-437442e856f6',0.95,'2026-06-30','active',datetime('now')),
  ('company.systems.core',(SELECT id FROM life_domains WHERE domain_key='company'),'reference','Temel iş sistemleri BizimHesap, Luca, ALKAM Mali, Moka United, Farmazon, Gözde Med, Vizör DIA, Gmail, Google Drive ve Telegram’dır; erişim aracı varsa API öncelikli, gerekirse izinli GUI otomasyonu kullanılır.','user-confirmed:2026-09-06',1.0,'2026-09-06','active',datetime('now')),
  ('company.order_payment_task_separation',(SELECT id FROM life_domains WHERE domain_key='company'),'standing_rule','Siparişler, ödemeler ve yapılacaklar ayrı kategorilerde izlenir; aralarında kaynaklı ilişki kurulabilir fakat durumları birbirine karıştırılmaz.','chatgpt:6a453de7-df54-83eb-b5f7-74b558488abe',0.95,'2026-07-01','active',datetime('now')),
  ('company.diaper.default_pack_rule',(SELECT id FROM life_domains WHERE domain_key='company'),'business_rule','Hasta bezi siparişlerinde kullanıcı özellikle “serme 10’lu” demedikçe paketler 30’lu kabul edilir.','user-confirmed:2026-09-03',1.0,'2026-09-03','active',datetime('now')),
  ('company.diaper.end_to_end_flow',(SELECT id FROM life_domains WHERE domain_key='company'),'business_rule','Hasta bezi operasyonu sipariş tarihi, açık sipariş, balyadan adede dönüşüm, fiyat listesi/iskonto/özel ürün kontrolü, sevk tarihi, BizimHesap proforma veya fatura taslağı, fatura tarihi ve tahsilat takibini uçtan uca bağlar.','user-confirmed:2026-09-03',1.0,'2026-09-03','active',datetime('now')),
  ('family.ege.relationship',(SELECT id FROM life_domains WHERE domain_key='family'),'identity','Ege, Ercan’ın oğludur.','user-confirmed:2026-09-06',1.0,'2026-09-06','active',datetime('now')),
  ('personal.capture.natural_language',(SELECT id FROM life_domains WHERE domain_key='personal'),'preference','Ercan; kişisel olay, harcama ve belgeleri Telegram’dan doğal dille veya dosyayla gönderip anında kaydedilmesini, sonradan sorulmasını ve analiz edilmesini ister.','user-confirmed:2026-09-06',1.0,'2026-09-06','active',datetime('now'))
ON CONFLICT(memory_key) DO UPDATE SET
  domain_id=excluded.domain_id,
  memory_type=excluded.memory_type,
  statement=excluded.statement,
  source_ref=excluded.source_ref,
  confidence=excluded.confidence,
  valid_from=excluded.valid_from,
  valid_until=NULL,
  status='active',
  updated_at=datetime('now');

INSERT INTO memory_import_runs(
  run_key,provider,source_scope,status,sources_seen,sources_scanned,
  candidates_created,memories_accepted,secrets_rejected,error_summary,completed_at
)
VALUES(
  'chatgpt-bootstrap-20260906','chatgpt','accessible-app-index','partial',18,8,14,14,0,
  'Erişilebilen sohbetler kademeli tarandı. Hesabın eksiksiz geçmişi için resmi conversations.json dışa aktarımı henüz bulunamadı.',
  datetime('now')
)
ON CONFLICT(run_key) DO UPDATE SET
  status=excluded.status,
  sources_seen=excluded.sources_seen,
  sources_scanned=excluded.sources_scanned,
  candidates_created=excluded.candidates_created,
  memories_accepted=excluded.memories_accepted,
  error_summary=excluded.error_summary,
  completed_at=excluded.completed_at;
