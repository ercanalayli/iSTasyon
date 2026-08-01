# BizimHesap B2B API Notlari

Kaynak dokumanlar:

- `BizimHesap_B2B_API_New.pdf`
- Kullanici tarafindan 2026-06-29 paylasilan Entegrasyon API dokumani metni.

## Var Olan Endpointler

- `POST /addinvoice`: alis/satis faturasi ekler.
- `POST /cancelinvoice`: `AddInvoice` ile olusan faturayi iptal eder.
- `GET /products`: urun listesini getirir.
- `GET /warehouses`: depo listesini getirir.
- `GET /inventory/{depo-id}`: depo stok listesini getirir.
- `GET /customers`: cari/musteri listesini getirir.
- `GET /abstract/{musteri-id}`: cari ekstresini getirir.
- `POST /addcustomer`: cari ekler.
- `POST /addproduct`: urun/hizmet ekler.

## AperiON Karari

Bu API fatura, cari, urun ve stok tarafinda ekran botuna gore daha saglam bir yoldur.
Ancak dokumanda banka/kasa hareketi veya tahsilat/odeme fisini dogrudan isleyen endpoint yok.

Bu nedenle:

- Fatura, cari ve urun detayi icin B2B API tercih edilecek.
- Urun, depo, stok ve cari okumalari icin B2B API, Puppeteer rapor botlarinin yerine gecmeye adaydir.
- Alis/satis faturasi olusturma icin `AddInvoice` resmi yol olarak degerlendirilecek.
- Banka ekstresi -> Onay Merkezi -> BizimHesap banka/kasa kaydi hattinda, BizimHesap banka/kasa API endpointi gelene kadar mevcut kilitli worker korunacak.
- Kullanici onayi olmadan kesin BizimHesap kaydi yapilmayacak.
- API token GitHub Secret olarak tutulacak, koda veya loga yazilmayacak.

## Dokumanda Gorunmeyen Kritik Eksik

Asagidaki islemler icin verilen dokumanda net endpoint gorunmuyor:

- Banka/kasa hareketi ekleme.
- Banka masrafi kaydi.
- Tahsilat/odeme fisi ekleme.
- Hesaplar arasi virman.

Bu yuzden bankadan gelen hareketlerin BizimHesap'a islenmesinde API tek basina yeterli degil. Bu hat icin ya BizimHesap'tan ek endpoint istenecek ya da mevcut Puppeteer worker kilitli sekilde korunacak.

## Gerekli Secretlar

- `BIZIMHESAP_B2B_TOKEN`
- `BIZIMHESAP_FIRM_ID`

BizimHesap uyelik ekranindaki eslesme:

- `Api Key(FirmID)` -> `BIZIMHESAP_FIRM_ID`
- `Zirve Express Aktarim Api Key` -> once `BIZIMHESAP_B2B_TOKEN` olarak denenir.

2026-06-29 canli GET sonucu:

- `Api Key(FirmID)` ve `Zirve Express Aktarim Api Key` ile `products`, `customers`, `warehouses` GET test edildi.
- `token` header, `Authorization: Bearer` ve `?token=` query bicimleri denendi.
- Ucunde de BizimHesap `401 Authorization has been denied for this request` dondurdu.
- Sonuc: Bu Zirve anahtari B2B GET endpointleri icin yetkili gorunmuyor veya BizimHesap tarafinda API erisimi henuz acik degil.

Opsiyonel:

- `BIZIMHESAP_B2B_BASE_URL`
- `BIZIMHESAP_B2B_AUTH_MODE`: `token-header` varsayilan, alternatifler `bearer`, `query-token`.

## Kontrol Komutlari

Yerel:

```powershell
npm run verify:bizimhesap:b2b-api
```

Canli, sadece okuma yapan GET testi:

```powershell
npm run verify:bizimhesap:b2b-api:live
```

Canli yazma bu komutlarla yapilmaz.
