# BizimHesap B2B API Notlari

Kaynak dokuman: `BizimHesap_B2B_API_New.pdf`.

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
- Banka ekstresi -> Onay Merkezi -> BizimHesap banka/kasa kaydi hattinda, BizimHesap banka/kasa API endpointi gelene kadar mevcut kilitli worker korunacak.
- Kullanici onayi olmadan kesin BizimHesap kaydi yapilmayacak.
- API token GitHub Secret olarak tutulacak, koda veya loga yazilmayacak.

## Gerekli Secretlar

- `BIZIMHESAP_B2B_TOKEN`
- `BIZIMHESAP_FIRM_ID`

Opsiyonel:

- `BIZIMHESAP_B2B_BASE_URL`

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
