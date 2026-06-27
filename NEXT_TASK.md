# AperiON Next Task

Son guncelleme: 2026-06-27 Europe/Istanbul

## Aktif Tek Hedef

Canli GitHub yayin / push kilidini temizlemek.

Durum: Ana veri denetimi kartina gunluk kullanim paneli eklendi. Banka Canli / Onay Akisi satirlarinda hedef hesap, cari, kayit turu, kuyruk/worker kaniti ve hazir degil sebebi gorunur hale getirildi. Yerel commitler hazir; ancak GitHub HTTPS push, credential/transport katmaninda timeout ile takiliyor.

## Neden Bu Hedef?

Kullanici canlida gormek istiyor. Kod yerelde test edilmis olsa bile GitHub Pages canli yayin almadan gunluk kullanima gecis eksik kalir.

## Siradaki Is Paketi

1. GitHub push kilidini temizle: credential manager, HTTPS transport veya alternatif GitHub API yolu.
2. Yerel commitleri `main` branch'e yayinla.
3. GitHub Pages URL'sinde yeni build'in geldigini kontrol et.
4. Canlida Banka Canli ve Gunluk Kullanim Durumu panellerini gozle kontrol et.
5. `npm run verify:bank-approval-action`, `npm run verify:daily-readiness`, `npm run preflight` tekrar calistir.

## Kabul Kriteri

- GitHub `main` son yerel commitlere ilerlemis olmalidir.
- Canli Pages ekrani yeni panel ve banka aksiyon kilidini gostermelidir.
- Push yapilamiyorsa sebep net ve kullanicinin yapacagi tek adimla yazilmalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
