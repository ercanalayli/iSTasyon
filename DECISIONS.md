# AperiON Decisions

## D-010 Personal accruals are source-bound and separate from payment proof

Batikent personal aidat and yakit obligations are read from Apsiyon through a
local persistent session. Amounts and dates may enter the Finance Calendar only
with source evidence. Apsiyon accrual is not proof of payment; payment closure
requires a matching bank movement or receipt. Credentials, browser profile, and
raw source exports remain local and are ignored by Git.

## D-009 Bilanco Veri Kaniti Kurali

Karar: Ana ekrandaki bilanço gorunumu, kaynak kaniti olmayan bir kalemi
kesin finansal tutar gibi gostermeyecektir. Banka/kasa yalnizca son bakiye
alanini tasiyan ekstre kayitlarindan; stok/FIFO, ticari alacak ve ticari borc
ise kendi ana kayitlari baglandiginda hesaplanir. Tahakkuk-nakit farki bir
izleme sinyalidir, tek basina bilanço alacagi veya borcu degildir.

Gerekce: CFO karar ekraninda hiz kadar veri guveni de zorunludur. Kaynak
baglanmadan gosterilen toplam, kullaniciyi yaniltir ve muhasebe mutabakatini
bozar.

## D-008 Kullanici Fonksiyonu Koruma Kurali

Karar: Kullanici tarafindan tarif edilen, ekranda ornegi verilen veya daha
once calisir durumda bulunan hicbir AperiON fonksiyonu kullanicinin acik
talimati olmadan kaldirilmaz, gizlenmez veya daha dar bir akisa indirgenmez.
Yeni tasarimlar mevcut fonksiyonun yerine gecmek yerine onu gorunur,
erisebilir ve daha iyi anlasilir hale getirir.

Uygulama kurali:

- Her tasarim turunda mevcut ekranlar ve baglantilar fonksiyon envanteriyle
  kontrol edilir.
- Bir fonksiyon yeni sayfaya tasiniyorsa eski giris noktasi yonlendirme veya
  gorunur baglanti ile korunur.
- Eksik, demo veya kaynak bekleyen alanlar "yok" gibi gizlenmez; durumuyla
  birlikte gorunur tutulur.
- Bir fonksiyonu kaldirmak ancak kullanicinin acik "kaldir" veya "yerine
  bunu koy" emriyle mumkundur.

Gerekce: AperiON'un tasarim hedefi sadece sade gorunmek degil; kullanicinin
isletme, CFO ve hayat asistani icin tarif ettigi tum karar araclarini
guvenilir bicimde bir arada sunmaktir.

## 2026-07-03 - Supabase finansal yazma ve onay guvenligi

Karar: AperiON production mimarisinde `anon` role banka/onay/finans RPC'lerini calistiramaz ve finansal tablolara yazamaz. Dashboard/frontend temel olarak okuma ve kullanici karar ekrani gorevi gorur; kesin yazma, kuyruk kapatma, BizimHesap isleme ve bot kaynakli veri cekimi service_role kullanan bot/Edge Function/GitHub Actions katmanindan gecmelidir.

Gerekce: Claude'un canli denetiminde `approve_pending_bank_movement`, `approve_bank_transaction_v58`, `finance_calendar_mark_paid`, `finance_calendar_mark_collected`, `finance_calendar_approve` gibi SECURITY DEFINER fonksiyonlarin anon role'e acik olabildigi; `bank_transactions`, `banka_raw`, `bizimhesap_events`, `product_raw`, `audit_logs` gibi tablolarda eski prototip anon write politikalarinin kalabildigi goruldu. Bu durum kullanici onayi ve veri guveni prensibine aykiridir.

Sonuc:

- `supabase_security_hardening_v77.sql` repo icinde takip edilecek.
- Bu SQL canliya otomatik uygulanmaz; once etki analizi ve kullanici onayi gerekir.
- Hardening sonrasi Onay Merkezi, mail ekstre, BizimHesap queue ve Finans Takvimi aksiyonlari tekrar test edilir.
- Kullanici onayi olmadan canli BizimHesap/Supabase mutation yapilmaz.

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

## D-008 Belirsiz Gelen Banka Parasi

Karar: Banka hareketi, tarih, tutar ve kaynak hesap kanitli; fakat cari/karsi taraf eslesmesi belirsiz gelen para, ilgili gercek banka hesabinda `Hesaba Para Girisi` olarak kaydedilir. Cari veya tedarikci bakiyesi etkilenmez.

Gerekce: Belirsiz tahsilati tahmini bir cariye yazmak, cari mutabakatini bozar. Islem numarasi, banka, karsi taraf ve ham ekstre metni AperiON kuyruk ID'siyle aciklamada saklanir; sonradan dogru cariye/hesaba aktarim izlenebilir olur.

Guvenlik siniri: Banka adi kaynakla celisen, reklam/duyuru niteligindeki veya banka hareketi kaniti olmayan satirlar bu otomasyona giremez.

## D-009 Tarihsel Ekstre Mutabakati ve Kaynak Hesap Koruması

Karar: Ocak 2026'dan itibaren verilecek banka ekstreleri once salt-okunur
tarihsel mutabakat havuzuna alinir. Her satir islem numarasi, kaynak banka
hesabi, tarih, tutar ve duplicate key ile AperiON kuyrugu/BizimHesap islem
kanitina karsi kontrol edilir. Kanit bulunan satir tekrar yazilmaz.

Belirsiz gelen para icin yeni bir banka hesabi acilmaz. Hareket, gercek kaynak
banka hesabinda `Hesaba Para Girisi` olarak tutulur ve sonradan cari veya
hedef hesaba aktarilir. Bu yaklasim banka mutabakatini bozmadan belirsizligi
gorunur tutar.

Guvenli sinir: Tarihsel dosya taramasi tek basina BizimHesap'a kayit yazmaz.
Once `BizimHesap'ta islenmis`, `kuyrukta`, `guvenli isleme adayi` ve
`inceleme gerekli` raporu uretilir. Canli yazma sadece kaniti olan kayit
turleri icin ayri kullanici onayi ve sonuc kaniti ile yapilir.

## D-010 Hattat Aylik Odeme Listesi Kaynak Kurali

Karar: Hattat Musavir aylik odeme listeleri, isletmenin vergi/SGK ve diger
yasal odeme tahakkuklari icin kaynak belgedir. AperiON bunlari Finans Takvimi'ne
"beklenen/tahakkuk" olarak alir; PDF tek basina odeme yapildigi kaniti degildir.

Gerekce: Ayni vade veya vergi kalemi, banka hareketi olmadan odendi kabul
edilirse nakit durumu ve borc takibi yanlis gorunur. Kaynak dosya hash'i,
referans, tutar ve vade mukerrer kontrolunu saglar; odeme ancak banka/BizimHesap
mutabakati ile kapanir.
