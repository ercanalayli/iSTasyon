# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Banka onayindan BizimHesap kayit kanitina uctan uca dogrulama.

Durum: GitHub push kilidi `ercanalayli` hesabi secilerek cozuldu. `main` branch `5370338` commit'ine ilerledi ve GitHub Pages yeni kodu donduruyor. Banka Canli / Onay Akisi artik hedef hesap, cari, kayit turu, kuyruk/worker kaniti ve hazir degil sebebini gosteriyor.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketi onayladiginda kaydin BizimHesap tarafinda gercekten olusup olusmadigini gormek istiyor. Siradaki risk butonun calismasi degil; worker sonucunun ve BizimHesap kayit kanitinin her satirda izlenebilir olmasi.

## Siradaki Is Paketi

1. Canli ekranda 1 adet hazir banka hareketi sec.
2. Onayla / kuyruga al aksiyonunun Supabase durumunu kontrol et.
3. BizimHesap queue worker dry-run veya kontrollu modda sonuc uretsin.
4. Satirda kuyruk id, worker sonucu ve BizimHesap kayit var/yok kaniti gorunsun.
5. Canli BizimHesap'a kesin kayit gerekiyorsa kullanici onayi almadan yapma.

## Kabul Kriteri

- Secilen hareketin onay/kuyruk durumu Supabase'de gorulmelidir.
- Worker sonucu satirda okunmalidir.
- BizimHesap'a kesin kayit yapildiysa kanit tarihi/id/sonuc gorunmelidir.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
