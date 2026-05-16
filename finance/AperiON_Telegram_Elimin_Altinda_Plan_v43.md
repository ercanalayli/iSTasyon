# AperiON Telegram + Elinin Altında Kontrol Planı v43

## Amaç
Ödenecekler, tahsil edilecekler ve yapılacaklar her an kullanıcının elinin altında olacak. Ana ekran, Telegram bot ve onay merkezi aynı mantıkla çalışacak.

## Ana prensip
Bu üç grup ayrı ayrı ama tek kontrol merkezinde izlenecek:

1. Ödenecekler
2. Tahsil Edilecekler
3. Yapılacaklar

Bunlar sadece rapor kartı olmayacak; tıklanınca liste açılacak, Telegram'dan sorulacak, onaylanacak ve tamamlandı/ertelendi/ödendi/tahsil edildi durumuna geçirilecek.

---

## 1. Ana ekranda her zaman üstte olacak kritik kartlar

Ana ekranın en üstünde sabit hızlı kontrol bölümü olacak:

- Bugün Ödenecek
- Bu Hafta Ödenecek
- Bu Ay Ödenecek
- Vadesi Geçen Ödenecek
- Bugün Tahsil Edilecek
- Bu Hafta Tahsil Edilecek
- Bu Ay Tahsil Edilecek
- Vadesi Geçen Tahsilat
- Bugünkü Yapılacaklar
- Geciken Yapılacaklar
- Onay Bekleyenler
- Telegram Bildirim Durumu

Bu kartlar scroll aşağı inse bile mobilde kolay erişilebilir olmalı.

---

## 2. Telegram bot komutları

Bot aşağıdaki komutları desteklemeli:

```text
/bugun
/odenecek
/tahsil
/yapilacak
/geciken
/onay
/rapor
```

### /bugun
Bugünün özetini verir:
- Bugün ödenecekler
- Bugün tahsil edilecekler
- Bugünkü yapılacaklar
- Onay bekleyenler

### /odenecek
Ödenecekleri listeler:
- Bugün
- Bu hafta
- Bu ay
- Geciken

### /tahsil
Tahsil edilecekleri listeler:
- Bugün
- Bu hafta
- Bu ay
- Geciken

### /yapilacak
Yapılacak işleri listeler:
- Bugün
- Geciken
- Bekleyen
- Tamamlanan

### /onay
Onay bekleyen kayıtları listeler:
- Belirsiz banka hareketi
- Eksik ürün maliyeti
- Belirsiz gider kategorisi
- BizimHesap'a işlenecek dry-run kayıtları

---

## 3. Telegram aksiyon butonları

Her satırda buton olacak:

### Ödenecekler
- Ödendi
- Ertele
- Detay
- Not Ekle

### Tahsil Edilecekler
- Tahsil Edildi
- Ertele
- Arandı / Hatırlatıldı
- Detay
- Not Ekle

### Yapılacaklar
- Tamamlandı
- Ertele
- Öncelik Ver
- Detay
- Not Ekle

### Onay Bekleyenler
- Onayla
- Reddet
- Düzenle
- Detay

---

## 4. Veri tabloları

Kullanılacak temel tablolar:

- finance_payables
- finance_receivables
- finance_payments
- finance_collections
- aperion_tasks
- telegram_action_log
- approval_queue

---

## 5. Yeni yapılacak tablo: aperion_tasks

Yapılacaklar ayrı tablo olarak tutulacak.

Alanlar:
- id
- company
- task_date
- due_date
- title
- description
- related_cari
- related_amount
- priority
- status
- source_type
- telegram_message_id
- completed_at
- created_at

---

## 6. Yeni yapılacak tablo: telegram_action_log

Telegram üzerinden yapılan her işlem loglanacak.

Alanlar:
- id
- telegram_user_id
- telegram_chat_id
- command
- action_type
- target_table
- target_id
- old_status
- new_status
- note
- created_at

---

## 7. Ana ekran entegrasyonu

v42 komuta matrisi üzerine v43 hızlı erişim şeridi eklenecek:

```text
Ödenecekler | Tahsil Edilecekler | Yapılacaklar | Onay Bekleyenler | Telegram
```

Her kart tıklanınca liste açacak.

---

## 8. Günlük Telegram raporu

Her sabah ve gün sonunda otomatik rapor:

### Sabah raporu
- Bugün ödenecekler
- Bugün tahsil edilecekler
- Bugünkü yapılacaklar
- Gecikenler

### Gün sonu raporu
- Bugünkü satış
- Bugünkü tahsilat
- Bugünkü ödeme
- Tamamlanan işler
- Kalan ödenecekler
- Kalan tahsil edilecekler
- Yarın kritikler

---

## 9. Güvenlik

- Telegram'dan gelen hiçbir işlem direkt silme yapmayacak.
- Ödendi/tahsil edildi/tamamlandı işlemleri loglanacak.
- Büyük tutarlı işlemlerde ikinci onay istenecek.
- BizimHesap'a yazma işlemi dry-run/onay olmadan yapılmayacak.

---

## Uygulama sırası

1. SQL: aperion_tasks + telegram_action_log + quick command views
2. v43 ana ekran: üst hızlı erişim kartları
3. Telegram bot komut iskeleti
4. Telegram buton callback iskeleti
5. Onay merkezi bağlantısı
6. Sabah/gün sonu otomatik rapor
