# AperiON iSTasyon – Telegram Kuralları

Telegram, AperiON iSTasyon'da onay ve alarm kanalıdır. Telegram mesajları kısa olmalı ama karar vermek için yeterli kanıtı içermelidir.

## Ana ilke

Telegram sadece bildirim değil, kontrollü onay merkezidir.

Kullanıcı Telegram'dan bir kaydı onayladığında hangi kaydı onayladığını karıştırmamalıdır.

## Onay mesajında zorunlu bilgiler

- AperiON yorumu
- İşlem tipi önerisi
- Risk seviyesi
- Banka
- Hesap
- Tarih
- Saat
- Tutar
- Açıklama
- Uzun açıklama
- Karşı taraf
- Kaynak hesap
- Hedef hesap
- Referans
- Bakiye
- PDF sayfa no veya Excel satır no
- Ham ekstre satırı
- Onay linki

## Durum mesajları

Onay bekliyor:

**ONAY BEKLİYOR - APERION**

Onaylandı:

**ONAYLANDI - APERION**

Reddedildi:

**REDDEDİLDİ - APERION**

BizimHesap'a işlendi:

**BİZİMHESAP'A İŞLENDİ - APERION**

Hata:

**İŞLENEMEDİ - APERION**

## Batch yönetimi

Çok sayıda banka hareketi varsa Telegram'a yüzlerce mesaj aynı anda gönderilmez.

Önerilen sıra:

- 10'arlı batch
- Onaylananları işle
- Sonra yeni batch gönder

## Onaylandıktan sonra görünüm

Onaylanan mesaj kullanıcıyı karıştırmayacak şekilde güncellenmelidir.

Tercih edilen davranış:

1. Mesaj metnini durumla güncelle.
2. Onay butonlarını pasifleştir veya kaldır.
3. İşlenince ayrıca “BİZİMHESAP'A İŞLENDİ - APERION” durumuna çek.

## Yasak davranışlar

- Sadece “2.400 TL” gibi eksik bilgi göndermek
- Karşı tarafı göstermemek
- Açıklamayı kırpmak
- Onaylandı mı işlenmiş mi belirsiz bırakmak
- Aynı kaydı tekrar tekrar onaya göndermek

## Telegram otomasyon görevi

Onay durumları periyodik olarak güncellenmelidir.

Mevcut not:

- “AperiON Telegram onay durumunu guncelle” otomasyonu 5 dakikada bir onay durumlarını güncellemek üzere kurgulanmıştır.
