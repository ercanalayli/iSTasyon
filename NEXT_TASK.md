# AperiON Next Task

Son guncelleme: 2026-06-27 Europe/Istanbul

## Aktif Tek Hedef

Gunluk kullanilabilir surum kontrolu.

Durum: Firma izolasyonu icin kritik ALAYLI filtreleri ve `verify:firm-isolation` kontrolu eklendi. Siradaki tur yeni tasarim degil, gunluk kullanimda acilacak ekranlarin hangisinin karar verilebilir seviyede oldugunu netlestirmek ve kalan blokajlari siralamak olmalidir.

## Neden Bu Hedef?

Veri guveni, banka onay zinciri ve firma izolasyonu temel duzeltmeleri yapildi. Simdi kullanici sabah programi actiginda hangi ekranlara guvenebilecegini net gormelidir.

## Siradaki Is Paketi

1. Ana ekran, Banka Canli, Gelir Tablosu, Satis/Tahsilat, Urun Karliligi ve Cari Risk ekranlarini tek tek kontrol et.
2. Her ekran icin production-ready / kismen / eksik durumunu dosyaya yaz.
3. Gunluk kullanilabilir surum icin ilk 5 blokaji belirle.
4. Gerekirse sadece durum/uyari metni duzelt; yeni buyuk tasarim yapma.
5. `npm run preflight`, `npm run verify:firm-isolation`, `npm run finance-smoke` calistir.

## Kabul Kriteri

- Kullanici hangi ekrani gunluk kullanabilecegini acikca bilmelidir.
- Production-ready olmayan ekranlar demo gibi degil, eksik kaynak notuyla gorunmelidir.
- Ilk 5 blokaj net ve sirali olmalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
