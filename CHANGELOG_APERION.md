# AperiON Changelog

## 2026-06-27

### Eklendi

- Koordineli calisma protokolu repo standardi olarak baslatildi.
- `PROJECT_STATUS.md`, `NEXT_TASK.md`, `QA_CHECKLIST.md`, `DECISIONS.md` ve `CHANGELOG_APERION.md` tek-kaynak dosyalari olusturuldu.
- Mevcut proje durumu son teknik denetim bulgularina gore belgelendi.

### Yayin

- Koordineli calisma protokolu commit'i GitHub `main` branch'e pushlandi.

### Denetlendi

- `npm run preflight`
- `npm run sync:bizimhesap:plan`
- `npm run sync:bizimhesap:dry`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`
- `npm run bank:approval:preview`
- `npm run verify:bizimhesap:queue`

### Bulunan Kritik Notlar

- BizimHesap dry-run akisi tam guvenli degil; satis tarafinda DB yazimi gorunuyor.
- Son islemler conflict hatasi basari icinde saklanabiliyor.
- Hourly BizimHesap GitHub workflow son kontrolde basarisiz gorundu.
- Banka onay merkezi teknik olarak bagli, ancak tum canli kayitlar icin uctan uca kanit tamam degil.

### Duzeltildi

- `aperion_veri_senkron.js` dry-run modunu satis ve son-islemler botlarina da iletir hale getirildi.
- `bizimhesap_bot.js` dry-run modunda `sales_raw` icin delete/insert yapmadan onizleme sayisini loglar.
- `bizimhesap_son_islemler_izle.js` dry-run modunda Supabase/state yazimini atlar.
- `bizimhesap_son_islemler_izle.js` Supabase hatasini artik sadece loglamaz; hata olarak yukari tasir.

### Dogrulandi

- `node --check aperion_veri_senkron.js`
- `node --check bizimhesap_bot.js`
- `node --check bizimhesap_son_islemler_izle.js`
- `npm run sync:bizimhesap:plan`
- `npm run sync:bizimhesap:dry`
- `npm run preflight`
- `npm run verify:bizimhesap:queue`
- `npm run finance-smoke`

### Banka Onay Zinciri

- Banka Canli ekrani `pending_bank_movements -> bizimhesap_queue` hattina ek olarak `bank_transactions -> bizimhesap_posting_queue` hattini da okur hale getirildi.
- Banka hareketi kontrol alanina kuyruk id, worker sonucu ve BizimHesap kayit var/yok bilgisi eklendi.
- Telegram/gorsel `bank_transactions` kayitlari icin onay/ret butonlari `approve_bank_transaction_v58` ve `reject_bank_transaction_v58` RPC'lerine baglandi.
- Ust KPI'da queue sayimi hem `ready_for_bizimhesap/processed` hem de `pending/posted` durumlarini kapsayacak sekilde genisletildi.

### Banka Onay Dogrulamasi

- `npm run bank:approval:preview`
- `npm run verify:bizimhesap:queue`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`

### Firma Izolasyonu

- Ana karar ekranindaki `bizimhesap_queue` sorgulari `company_id = alayli` filtresiyle kilitlendi.
- Bot loglari `firma_id = alayli` filtresiyle sinirlandi.
- `tools/verify_firm_isolation_v66.cjs` eklendi.
- `npm run verify:firm-isolation` komutu eklendi.

### Firma Izolasyonu Dogrulamasi

- `npm run verify:firm-isolation`
- `npm run preflight`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`

### Gunluk Kullanim Durumu

- Ana veri denetimi kartina `Gunluk Kullanim Durumu` paneli eklendi.
- Ana moduller gunluk kullanilabilir / kismen hazir / blokajli olarak ayrildi.
- Ilk 5 blokaj ana ekranda gorunur hale getirildi.
- `tools/verify_daily_readiness_v67.cjs` eklendi.
- `npm run verify:daily-readiness` komutu eklendi.

### Gunluk Kullanim Dogrulamasi

- `node --check tools/verify_daily_readiness_v67.cjs`
- `npm run verify:daily-readiness`
- `npm run verify:firm-isolation`
- `npm run preflight`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`

### Degismedi

- Canli BizimHesap kaydi yapilmadi.
- Yeni tasarim veya refactor yapilmadi.
- Firma verisi tasinmadi veya silinmedi.
