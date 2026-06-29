# AperiON Changelog

## 2026-06-29

### Canli Yayin

- GitHub push kilidi cozuldu.
- `GCM_ACCOUNT=ercanalayli` ile dogru GitHub hesabi secildi.
- `5370338 Clarify bank approval posting actions` commit'i GitHub `main` branch'e pushlandi.
- GitHub raw `index.html` icinde `Gunluk Kullanim Durumu`, `bankActionState` ve `bank-posting-proof` dogrulandi.
- GitHub Pages `https://ercanalayli.github.io/iSTasyon/?v=5370338` yeni kodu dondurdu.

### Canli Yayin Dogrulamasi

- `git ls-remote origin refs/heads/main`
- `Invoke-WebRequest https://raw.githubusercontent.com/ercanalayli/iSTasyon/main/index.html`
- `Invoke-WebRequest https://ercanalayli.github.io/iSTasyon/?v=5370338`
- `npm run verify:bank-approval-action`

### Banka -> BizimHesap Kanit Denetimi

- `npm run bank:approval:preview` calisti.
- 25 onay bekleyen banka hareketi okundu.
- 19 hareket yuksek guvenli, 6 hareket inceleme istiyor.
- `npm run bizimhesap:queue:dry` calisti.
- BizimHesap worker kuyrugunda 0 hazir kayit oldugu dogrulandi.
- Canli BizimHesap kaydi yapilmadi.

### Banka -> BizimHesap Sonuc

- Hat teknik olarak bagli: banka onayi -> `bizimhesap_queue` -> worker -> processed/failed.
- Su anda islenecek kuyruk bos.
- Sonraki adim kullanici onayli bir banka hareketini kuyruga almak.

### Banka Onay Aday Secimi

- `tools/select_bank_approval_candidate_v69.cjs` eklendi.
- `npm run bank:approval:candidates` komutu eklendi.
- Komut preview raporundan dusuk riskli ilk onay adayini secer.
- Ilk onerilen aday: VakifBank 2026-06-10, -8,37 TL, Banka/POS masrafi, guven %90.
- Pending id: `9b91f984-c94b-4005-92ab-7fb334aa31e7`.
- Canli onay veya BizimHesap kaydi yapilmadi.

### Guvenlik Kilitli Kuyruga Alma

- `tools/approve_bank_candidate_v70.cjs` eklendi.
- `npm run bank:approval:candidate:dry` komutu eklendi.
- `npm run bank:approval:approve-selected` komutu eklendi.
- Canli RPC icin `--id` ve `--confirm ONAYLIYORUM` zorunlu hale getirildi.
- `tools/verify_bank_candidate_approval_guard_v70.cjs` eklendi.
- `npm run verify:bank-candidate-guard` komutu eklendi.
- Dry-check calisti ve RPC calistirilmadigi dogrulandi.

### Banka Aday Kanit Okuma

- `tools/check_bank_candidate_queue_proof_v71.cjs` eklendi.
- `npm run bank:approval:candidate:proof` komutu eklendi.
- Secilen VakifBank -8,37 TL adayinin `pending` durumda oldugu dogrulandi.
- Aday icin `bizimhesap_queue` kaydi olmadigi dogrulandi.
- Komut salt-okunur calisti; canli onay/RPC calistirilmadi.

### Kullanici Onayli Banka Kuyruga Alma

- Kullanici yalnizca secili VakifBank 2026-06-10, -8,37 TL banka masraf adayi icin `onayliyorum` dedi.
- `node tools/approve_bank_candidate_v70.cjs --id 9b91f984-c94b-4005-92ab-7fb334aa31e7 --confirm ONAYLIYORUM` calisti.
- Pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7` status `approved` oldu.
- BizimHesap queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa`, status `ready_for_bizimhesap` olustu.
- `npm run bank:approval:candidate:proof` pending ve queue kanitini dogruladi.
- `npm run bizimhesap:queue:dry` 1 hazir BizimHesap kuyruk kaydi buldu.
- BizimHesap'a kesin kaydetme/save islemi yapilmadi.

### BizimHesap Form Kontrolu

- `BIZIMHESAP_POSTING_LIVE=1 npm run bizimhesap:queue:form` calisti.
- BizimHesap kalici oturumla acildi ve ALAYLI firma portalina girildi.
- Queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin masraf formu dolduruldu.
- Formda tarih `10.06.2026`, tutar `8,37`, odeme durumu `Odendi`, aciklama alaninda queue id goruldu.
- Diagnostik gorsel: `diagnostics/bizimhesap_queue_3b30e1a0-0f02-4b0d-b03c-ae2779d448fa_form.png`.
- Kaydet tusuna basilmadi; kuyruk `ready_for_bizimhesap` durumunda kaldi.

### Kullanici Onayli BizimHesap Save Denemesi

- Kullanici `BizimHesap'a kaydetmeyi onayliyorum` dedi.
- Sadece queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin `BIZIMHESAP_POSTING_LIVE=1` ve `BIZIMHESAP_POSTING_SAVE=1` ile save modu calisti.
- Worker BizimHesap kaydet butonuna basildigini logladi.
- Supabase `mark_bizimhesap_queue_processed` RPC kurulu olmadigi icin queue kapanmadi.
- Yerelden SQL kurulum denemesi `password authentication failed for user "postgres"` hatasi verdi.
- Worker save sonrasi diagnostik ve queue status dogrulama logu uretecek sekilde guclendirildi.

### Manuel BizimHesap Kanit Kilidi

- Kullanici BizimHesap listesinde queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` iceren 8,37 TL banka masraf kaydinin olustugunu bildirdi.
- `data/bizimhesap_manual_posting_proofs.json` eklendi.
- Worker save modunda manuel kanitli queue id icin BizimHesap'a tekrar kaydetme yapmadan atlar.
- Testte ayni queue id tekrar calistirildi ve `tekrar kaydetme atlandi` sonucu alindi.

### BizimHesap B2B API Dokumani

- Kullanici yeni Entegrasyon API dokumanini paylasti.
- Mevcut `bizimhesap_api_client.cjs` dokumandaki fatura, cari, urun, depo, stok ve cari ekstre endpointleriyle karsilastirildi.
- `docs/bizimhesap_b2b_api_notlari.md` guncellendi.
- `npm run verify:bizimhesap:b2b-api` calisti; token ve firm id eksik oldugu icin canli okuma yapilmadi.
- Banka/kasa hareketi icin dokumanda endpoint gorunmedigi not edildi.
- Kullanici BizimHesap uyelik ekraninda `Api Key(FirmID)` ve `Zirve Express Aktarim Api Key` alanlarini gosterdi; bunlar secret eslesmesi olarak not edildi.
- Zirve Express anahtariyla `token-header`, `bearer` ve `query-token` modlarinda canli GET denendi; hepsi 401 verdi, canli yazma yapilmadi.

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

### Banka Onay Aksiyonu

- Banka Canli / Onay Akisi satirlarinda hazirlik kontrolu eklendi.
- `BizimHesap'a Kaydet` / `KuyruÄŸa Al` aksiyonu yalnizca hazir kayitlarda aktif kalir.
- Dusuk guvenli, mukerrer adayli, cari belirsiz veya zaten kuyrukta/islenmis kayitlarda buton pasif hale gelir.
- Her satirda hedef hesap, cari, kayit turu ve BizimHesap kanit metni netlestirildi.
- Sabah onay kartlari da ayni hazirlik kontrolunu kullanir.
- `tools/verify_bank_approval_action_v68.cjs` eklendi.
- `npm run verify:bank-approval-action` komutu eklendi.

### Banka Onay Aksiyonu Dogrulamasi

- `node --check tools/verify_bank_approval_action_v68.cjs`
- `npm run verify:bank-approval-action`
- `npm run verify:daily-readiness`
- `npm run verify:firm-isolation`
- `npm run finance-smoke`
- `npm run preflight`
- `npm run bank:approval:preview`

### Degismedi

- Canli BizimHesap kaydi yapilmadi.
- Yeni tasarim veya refactor yapilmadi.
- Firma verisi tasinmadi veya silinmedi.
