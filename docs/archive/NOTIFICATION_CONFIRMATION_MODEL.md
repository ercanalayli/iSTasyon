# AperiON iSTasyon – İşlem Bildirim ve Kayıt Teyit Modeli

Bu dosya, kullanıcının hızlı not / ödeme emri / fatura / cari not gibi kritik işlemlerden sonra telefonuna net teyit bildirimi alması için kullanılacak modeli tanımlar.

## Ana karar

Kullanıcı bir işlem gönderdiğinde sistem sessiz kalmayacaktır.

Her kritik işlem için şu üç kayıt teyidi ayrı ayrı izlenir:

1. AperiON kaydı oluşturuldu mu?
2. Takvim / alarm kaydı oluşturuldu mu?
3. Bildirim kullanıcı telefonuna gönderildi mi?

## Temel kullanıcı beklentisi

Kullanıcı şunu yazar veya söyler:

```text
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Telefonuna şu tip cevap gelmelidir:

```text
✅ AperiON kaydı açıldı
Cari: Sena Medikal
Tutar: 100.000 TL
Tarih: 10 Temmuz 2026
Yöntem: Kredi kartı

✅ Takvim alarmı eklendi
Hatırlatma: 1 gün önce / ödeme sabahı / ödeme öncesi

📌 Durum: Kritik ödeme bekliyor
Kanıt: ödeme sonrası dekont/fiş bekleniyor
```

## Bildirim kanalları

### 1. Telegram cevap bildirimi

İlk ve ana teyit kanalıdır.

Telegram bot mesajı aldıktan sonra aynı sohbete cevap döner.

Avantaj:

- Anlık bildirim verir.
- Mesaj geçmişi kalır.
- Dekont/fotoğraf aynı kanaldan gönderilebilir.

### 2. iPhone / Google Calendar bildirimi

Ödeme tarihi veya hazırlık zamanı için takvim kaydı açılır.

Avantaj:

- Telefonun kendi alarm sistemi çalışır.
- ChatGPT automation limitine takılmaz.
- 1 gün önce / 3 saat önce / 30 dakika önce gibi uyarılar verilebilir.

### 3. AperiON Dashboard teyidi

Dashboardda işlem `Kritik Ödemeler`, `Hızlı Notlar` veya ilgili modül altında görünür.

Gösterilecek alanlar:

- Kayıt ID
- Cari / konu
- Tutar
- Tarih
- Ödeme yöntemi
- Takvim durumu
- Bildirim durumu
- Kanıt durumu
- Son güncelleme zamanı

### 4. Günlük / haftalık ödeme özeti

Kritik ödeme, günlük ve haftalık ödeme özetlerine otomatik eklenir.

## Durum alanları

Her hızlı işlemde şu durumlar tutulmalıdır:

```text
capture_status      → captured / failed
aperion_status      → saved / failed / pending
calendar_status     → scheduled / failed / not_required
notification_status → sent / failed / pending
proof_status        → waiting_proof / received / not_required
```

## Sessiz kalmak yasaktır

Sistem işlemi alamazsa bile kullanıcıya hata bildirmelidir.

Kabul edilmeyen durum:

```text
Kullanıcı mesaj attı, cevap yok.
```

Doğru davranış:

```text
❌ İşlem tam kaydedilemedi.
AperiON kaydı: başarılı
Takvim: başarısız
Sebep: Google Calendar bağlantısı yok
Yedek: günlük ödeme özetine eklendi
```

## İşlem garantisi mantığı

Tek bir kanal başarısız olursa işlem kaybolmaz.

Öncelik sırası:

1. Raw mesaj `quick_notes` içine yazılır.
2. Parser ödeme/fatura/görev sınıflandırması yapar.
3. Uygunsa `payment_promises` veya ilgili tabloya yazar.
4. Takvim/alarm oluşturmaya çalışır.
5. Telegram veya diğer bildirim kanalına sonuç döner.
6. Hata varsa audit log ve dashboard uyarısı oluşturur.

## Takvim bildirimi standardı

Ödeme kayıtlarında varsayılan hatırlatmalar:

- 1 gün önce
- Ödeme günü sabahı
- Ödeme saatinden 30 dakika önce

Saat belirtilmediyse varsayılan ödeme takip saati 09:00 kabul edilir.

## Ödeme yöntemi ve kanıt ilişkisi

- Nakit: ödeme sonrası kasa notu / makbuz / teslim kanıtı
- Havale/EFT/FAST: banka dekontu
- Çek: çek fotoğrafı, çek no, vade, banka
- Senet: senet fotoğrafı, vade, borçlu/alacaklı
- Kredi kartı: slip/ekstre/fiş veya ödeme ekranı

## Kabul kriteri

Kullanıcı hızlı not gönderdiğinde 5 saniye içinde en az bir telefon bildirimi gelmelidir.

Başarılı cevap örneği:

```text
✅ Kaydedildi
✅ Takvime eklendi
✅ AperiON kritik ödeme listesinde
```

Başarısız cevap örneği:

```text
⚠️ Not alındı ama takvim eklenemedi.
Sebep: Calendar bağlantısı yok.
AperiON kritik ödeme listesinde bekliyor.
```
