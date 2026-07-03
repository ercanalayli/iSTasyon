# AperiON Decisions

## 2026-06-29 - BizimHesap B2B API siniri

Kullanici BizimHesap Entegrasyon API dokumanini paylasti. Dokumanda fatura, cari, urun, depo, stok ve cari ekstre endpointleri var.

Karar:

- Fatura/cari/urun/stok okumasi ve fatura olusturma icin B2B API tercih edilecek.
- Banka/kasa hareketi, banka masrafi, tahsilat/odeme fisi ve virman icin dokumanda endpoint olmadigi icin mevcut kilitli Puppeteer worker korunacak.
- B2B API canli yazma islemleri ayri onay ve ayri kilit olmadan calismayacak.
- Gerekli secretlar: `BIZIMHESAP_B2B_TOKEN`, `BIZIMHESAP_FIRM_ID`.
- 2026-06-29 testinde Zirve Express anahtari `token-header`, `bearer` ve `query-token` bicimleriyle GET endpointlerinde 401 verdi. BizimHesap'tan B2B token/API yetkisi teyit edilmeden bu hat production veri kaynagi sayilmayacak.

Son guncelleme: 2026-06-27 Europe/Istanbul

## D-001 Koordineli Calisma Protokolu

Karar: AperiON gelistirmesinde ChatGPT ve Codex koordineli calisma protokolu gecerlidir.

Gerekce: Codex limiti doldugunda is kaybi olmamasi, teknik yonun dagilmamasi ve kalite kontrolun tek kaynak dosyalardan devam edebilmesi.

Sonuc:

- Durum dosyalari repo kokunde tutulacak.
- Her turda tek ana hedef olacak.
- Tur sonunda durum dosyalari guncellenecek.

## D-002 Tek Kaynak Dosyalari

Karar: AÅŸaÄŸÄ±daki dosyalar zorunlu tek kaynak kabul edilir:

- `PROJECT_STATUS.md`
- `NEXT_TASK.md`
- `CHANGELOG_APERION.md`
- `QA_CHECKLIST.md`
- `DECISIONS.md`

Gerekce: Teknik durum, kararlar, sonraki is ve kalite kontrol farkli sohbetlerde kaybolmayacak.

## D-003 Oncelik Sirasi

Karar: Gelistirme onceligi su sirayla yurutulur:

1. Veri guveni
2. Finans Komuta Merkezi
3. Banka onay kuyrugu
4. Firma izolasyonu
5. Gunluk kullanilabilir surum

Gerekce: Veri guveni kilitlenmeden ekran tasarimi veya yeni ozellikler gunluk kullanim riskini azaltmaz.

## D-004 Canli Kayit ve Onay

Karar: Kullanici onayi olmadan canli BizimHesap kaydi, canli banka/kasa islemi veya kesin muhasebe kaydi yapilmaz.

Gerekce: AperiON karar verir ve onerir; kullanici onaylar; sonra sistem isler.

## D-005 Demo Veri Yasagi

Karar: Demo, ornek veya tahmini veri canli karar ekrani gibi gosterilemez.

Gerekce: Finansal karar ekrani yalnizca kaynagi belli ve izlenebilir veriyle guvenilir olur.

## D-006 Firma Izolasyonu

Karar: ALAYLI MEDIKAL aktif firma kabul edilir; diger firmalar coklu firma mimarisinde ayri veri katmani olarak ele alinacaktir.

Gerekce: Farkli firmalarin satis, banka, cari, stok ve muhasebe kayitlari karismamalidir.

## D-007 Canli Yayin ve Preview Kaynaklari

Karar: AperiON iSTasyon icin kaynak kod tek merkezi `ercanalayli/iSTasyon` `main` branch'tir. Bu turda dogrulanabilen production yayin GitHub Pages `https://ercanalayli.github.io/iSTasyon/` adresidir. Netlify e-postalari veya PR preview linkleri yardimci bilgi olabilir; production teyidi yerine gecmez. Repo icinde Cloudflare Pages `https://aperion-istasyon.pages.dev/` eski/alternatif canli hedef olarak kayitlidir, fakat bu ortamdan erisim basarisiz oldugu icin bu turda production kaniti sayilmadi.

Gerekce: Kullanici Netlify, GitHub Pages ve Cloudflare hatlarinin karismasindan dolayi hangi ekranin gercek oldugunu sorguladi. Tek kaynak ve dogrulanmis yayin ayri yazilmazsa finans/onay akisi guvenilir sekilde takip edilemez.

Sonuc:

- Kaynak kod dogrulamasi `main` branch uzerinden yapilir.
- Bu turdaki canli URL kontrolu GitHub Pages uzerinden yapildi.
- Netlify preview varsa sadece taslak/PR kaniti sayilir.
- Cloudflare Pages yeniden erisilebilir hale gelirse ayrica test edilmeden production kaniti sayilmaz.
- Canli kontrol botlari birden fazla yayin adayini deneyebilir; secilen URL rapora yazilmalidir.
- Commit sonrasi kabul kriteri: GitHub CI, Pages deploy ve canli URL icerik kontrolu.
