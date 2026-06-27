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

### Degismedi

- Canli BizimHesap kaydi yapilmadi.
- Yeni tasarim veya refactor yapilmadi.
- Firma verisi tasinmadi veya silinmedi.
