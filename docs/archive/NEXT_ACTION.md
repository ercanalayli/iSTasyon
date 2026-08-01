# AperiON iSTasyon – Sıradaki Aksiyon

Tarih: 2026-07-08

## En kritik hedef

BizimHesap’a işleme kayıt etme işini güvenli şekilde tamamlamak.

Canlı kayıt için zorunlu sıra:

```text
1. Banka hareketi kanıtı
2. Kullanıcı onayı
3. Supabase queue kaydı
4. BizimHesap dry-run planı
5. Tek kayıt canlı form denemesi
6. Kaydetme
7. BizimHesap’tan geri doğrulama
8. Queue status = processed
9. Telegram/dashboard durum güncelleme
```

## İlk yapılacak teknik iş

### 1. Banka kurallarını dokümana tam yaz

`docs/BANK_RULES.md` içine şu kurallar eklenecek:

- MokaUnited-Sanal Pos Ödemesi → Moka banka transferi.
- KMH-ANAPARA BORCU TAHSİLATI → KMH ana para kapama, gider değil.
- Batch Komisyonu → Banka/POS komisyon gideri.
- Gelen FAST → cari tahsilat adayı, cari netleşmeden otomatik kayıt yok.

### 2. BizimHesap worker dry-run kontrolü

`npm run bizimhesap:queue:dry` çıktısı kontrol edilecek.

Beklenen:

- POS banka transferi `bank_transfer` yolunda.
- Moka banka transferi `bank_transfer` yolunda.
- KMH ana para kapama `bank_transfer` yolunda.
- Batch komisyonu gider/masraf yolunda.
- Cari belirsiz FAST hareketleri otomatik save’e kapalı.

### 3. İlk canlı kayıt denemesi

Sadece 1 kayıt ile denenmeli:

```text
AperiON BizimHesap Queue Worker
live: true
save: true
limit: 1
```

Önce tek kayıt doğru kaydedilmeli ve doğrulanmalı. 10 kayıt birden çalıştırılmayacak.

## Kullanıcıdan istenecek günlük veri

Her banka için:

- Hesap bilgileri ekranı
- Son 1 gün veya son 7 gün hareket ekranı
- Tarih / açıklama / tutar / bakiye görünecek şekilde ekran görüntüsü
- Mümkünse haftalık/aylık Excel veya PDF ekstre

## Yeni sohbet açılırsa ilk mesaj

```text
AperiON iSTasyon buradan devam.
Önce repo içindeki docs/SESSION_STATE.md ve docs/NEXT_ACTION.md dosyalarını oku.
Sonra Yapılanlar / Kalanlar / Riskler / Sıradaki Adım olarak özet ver.
```

## Şu an canlı kayıt izni

Henüz toplu canlı kayıt yok.

Sadece kullanıcı açıkça onaylarsa ve queue/dry-run kanıtı varsa tek kayıt canlı denenebilir.
