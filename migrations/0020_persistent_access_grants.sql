PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS standing_access_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_key TEXT NOT NULL UNIQUE,
  principal TEXT NOT NULL DEFAULT 'ercan',
  connector_key TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','suspended','revoked')),
  granted_by TEXT NOT NULL,
  grant_source_ref TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at TEXT,
  revocation_source_ref TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_standing_access_grants_active
  ON standing_access_grants(principal,connector_key,status,revoked_at);

INSERT INTO memory_items(
  memory_key,domain_id,memory_type,statement,source_ref,confidence,valid_from,status,updated_at
)
SELECT
  'aperion.authorization.persistent_connector_access',
  id,
  'standing_rule',
  'Ercan bir sisteme veya hesaba erişim izni verdiğinde bu izin, Ercan açıkça iptal edene kadar aynı hesap ve aynı kapsam için geçerlidir. AperiON giriş, güvenli kasadan kimlik bilgisi kullanma, oturum yenileme, gezinme, okuma, sağlık kontrolü, bağlantı kurtarma ve taslak hazırlama için tekrar izin istemez. Bu kural para transferi/ödeme, faturayı veya muhasebe kaydını kesinleştirme, üçüncü kişiye mesaj gönderme, silme, erişim kapsamını büyütme, yeni API/OAuth anahtarı üretme, parola değiştirme, OTP/MFA ve CAPTCHA adımlarını kapsamaz.',
  'user-confirmed:2026-09-07',
  1.0,
  '2026-09-07',
  'active',
  datetime('now')
FROM life_domains WHERE domain_key='aperion'
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

INSERT INTO current_state_facts(
  fact_key,subject_type,subject_ref,predicate,value_json,truth_state,source_ref,observed_at,status
)
VALUES (
  'aperion.persistent_access_policy',
  'system',
  'aperion',
  'persistent_access_policy',
  '{"rule":"until_revoked","principal":"ercan","same_account_and_scope_only":true,"no_repeat_confirmation_scopes":["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"],"always_separate_scopes":["financial_commit","finalize_invoice_or_accounting_record","external_message","delete","permission_expansion","create_api_or_oauth_key","change_password","otp_mfa","captcha"]}',
  'confirmed',
  'user-confirmed:2026-09-07',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  'active'
)
ON CONFLICT(fact_key) DO UPDATE SET
  value_json=excluded.value_json,
  truth_state=excluded.truth_state,
  source_ref=excluded.source_ref,
  observed_at=excluded.observed_at,
  valid_until=NULL,
  status='active';

INSERT INTO standing_access_grants(
  grant_key,principal,connector_key,scopes_json,status,granted_by,grant_source_ref,notes,updated_at
)
VALUES
  ('ercan:bizimhesap:standard','ercan','bizimhesap','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','BizimHesap kesin kayıt/finansal commit kapsam dışıdır.',datetime('now')),
  ('ercan:moka_united:standard','ercan','moka_united','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','OTP/MFA gerektiğinde insan adımı zorunludur.',datetime('now')),
  ('ercan:farmazon:standard','ercan','farmazon','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07',NULL,datetime('now')),
  ('ercan:gozde_med:standard','ercan','gozde_med','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07',NULL,datetime('now')),
  ('ercan:vizor_dia:standard','ercan','vizor_dia','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07',NULL,datetime('now')),
  ('ercan:gmail:standard','ercan','gmail','["authenticate","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','E-posta gönderimi kapsam dışıdır.',datetime('now')),
  ('ercan:google_drive:standard','ercan','google_drive','["authenticate","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','Paylaşım ve erişim değişikliği kapsam dışıdır.',datetime('now')),
  ('ercan:telegram:standard','ercan','telegram','["authenticate","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','Üçüncü kişilere temsilî mesaj gönderimi kapsam dışıdır.',datetime('now')),
  ('ercan:whatsapp:standard','ercan','whatsapp','["authenticate","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','Üçüncü kişilere temsilî mesaj gönderimi kapsam dışıdır.',datetime('now')),
  ('ercan:cloudflare:standard','ercan','cloudflare','["authenticate","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07','Yeni secret/API anahtarı oluşturma ve yetki kapsamını büyütme kapsam dışıdır.',datetime('now')),
  ('ercan:hermes_vps:standard','ercan','hermes_vps','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07',NULL,datetime('now')),
  ('ercan:aperion_windows_worker:standard','ercan','aperion_windows_worker','["authenticate","use_vault_credentials","refresh_session","navigate","read","health_check","recover_connection","prepare_draft"]','active','ercan','user-confirmed:2026-09-07',NULL,datetime('now'))
ON CONFLICT(grant_key) DO UPDATE SET
  scopes_json=excluded.scopes_json,
  status='active',
  granted_by=excluded.granted_by,
  grant_source_ref=excluded.grant_source_ref,
  revoked_at=NULL,
  revocation_source_ref=NULL,
  notes=excluded.notes,
  updated_at=datetime('now');
