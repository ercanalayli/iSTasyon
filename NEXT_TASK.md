# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Banka hareketi secimi ve kullanici onayli kuyruga alma.

Durum: GitHub push kilidi cozuldu ve canli Pages yeni kodu donduruyor. Banka onay plani 25 hareket okudu; 19 yuksek guvenli, 6 inceleme istiyor. BizimHesap worker dry-run 0 hazir kuyruk buldu. Yani onay ekraninda bekleyen hareket var, fakat BizimHesap worker'in isleyebilecegi kayit henuz kuyruga alinmamis.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketi onayladiginda kaydin BizimHesap tarafinda gercekten olusup olusmadigini gormek istiyor. Bunun icin once guvenli bir banka hareketi secilip kullanici onayiyla `bizimhesap_queue` icine alinmali.

## Siradaki Is Paketi

1. Canli Banka Canli ekraninda yuksek guvenli bir hareket sec: tercihen banka masrafi veya POS masrafi.
2. Kullanici onayi olmadan `approve_pending_bank_movement` RPC calistirma.
3. Kullanici onayindan sonra kaydin `bizimhesap_queue.status=ready_for_bizimhesap` oldugunu dogrula.
4. Sonra `npm run bizimhesap:queue:dry` ile worker planini oku.
5. Canli BizimHesap'a kesin kayit gerekiyorsa ayrica kullanici onayi al.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net olmalidir.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
