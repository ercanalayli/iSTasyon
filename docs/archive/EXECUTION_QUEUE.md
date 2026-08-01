# AperiON iSTasyon – Çalışma Kuyruğu

Bu dosya AperiON iSTasyon için yapılacak işleri önem sırasına göre tutar.

## Çalışma ilkesi

Kullanıcı her iş için tek tek teknik kontrol yapmayacak.

AperiON tarafında işler şu sırayla yürütülecek:

1. Kritik operasyon ve ödeme güvenliği
2. Hızlı not / Telegram / Siri giriş sistemi
3. Dashboard görünürlük ve CFO kokpit
4. Banka / BizimHesap güvenli kayıt zinciri
5. Gmail / fatura / ekstre otomasyonu
6. Kredi kartı / fatura / abonelik veri standardı
7. Şahsi finans ayrımı
8. Üst Akıl girdi işleme ve kalıcı kart mantığı

## P0 – Hemen bitmesi gerekenler

### P0.1 Telegram Quick Capture canlılık

Amaç:

- Kullanıcı Telegram'a tek cümle yazınca AperiON ödeme/not kaydı oluşmalı.
- Kullanıcı bot çalışıyor mu diye test etmemeli.

Durum:

- Telegram webhook kodu eklendi.
- Watchdog eklendi.
- Preflight endpoint eklendi.
- Health-check mantığı eklendi.
- Kullanıcıya hazır olmadan test yaptırılmayacak.

Eksik:

- Cloudflare environment variables kontrolü.
- Supabase quick_capture SQL çalıştırılması.
- Telegram webhook bağlama/yeniden bağlama sonucunun doğrulanması.
- Dashboardda Telegram Quick Capture sağlık kartı.

Hazır kabul kriteri:

```text
https://aperion-istasyon.pages.dev/api/telegram-preflight
ok=true
ready_for_user_test=true
```

### P0.2 Kritik ödeme yakalama ve teyit bildirimi

Amaç:

- Ödeme notu alındığında telefon bildirimi dönmeli.
- AperiON kaydı, takvim/alarm ve dashboard kaydı ayrı ayrı teyit edilmeli.

Durum:

- Sena Medikal 10 Temmuz 100.000 TL ödeme notu manuel kayda alındı.
- Günlük ve haftalık ödeme özetlerine eklendi.
- Google Calendar etkinliği oluşturuldu.
- Bildirim/teyit modeli dokümana yazıldı.

Eksik:

- Telegram Quick Capture’dan otomatik kayıt + otomatik teyit akışı.
- Calendar otomasyonu API/worker seviyesinde kalıcı bağlama.
- Dashboard kritik ödeme kartının gerçek quick_notes/payment_promises verisini okuması.

### P0.3 Dashboard ana ekran kalitesi

Amaç:

- Eski teknik kabuk yerine CFO/COO komuta merkezi görüntüsü.
- Mobilde 30 saniyede bugünkü kritik durum anlaşılmalı.

Durum:

- Eski şablon terk edildi.
- `aperion-home-v3.html` CFO Komuta Merkezi mantığına çevrildi.
- Cloudflare Pages ana yayın katmanı olarak seçildi.

Eksik:

- Telegram sağlık kartı.
- Kritik ödeme kartı gerçek veriye bağlama.
- Kredi kartı/fatura veri JSON veya Supabase view bağlantısı.
- Mobil görünüm tekrar test.

### P0.4 Üst Akıl belge/görsel alma kuralı

Amaç:

- Kullanıcının gönderdiği görsel veya belge yalnızca sohbet cevabı sayılmayacak.
- Bilgi önce geçmiş bağlamla eşleştirilecek, sonra uygun kalıcı kart adayı olarak sunulacak.
- Eksik bilgi varsa yalnızca eksik alan sorulacak.

Durum:

- Kullanıcı ÜST AKIL TALİMATI verdi.
- Bundan sonra cevap sonunda “Kalıcı kayıt önerisi” bölümü gösterilecek.

Eksik:

- Dashboardda kalıcı kart adayları bölümü.
- Abonelik, ödeme talimatı, hesap, kart, fatura, cari/tedarikçi kartlarının ortak veri şeması.
- Görselden çıkarılan bilgiyi Supabase master data tablolarına yazma akışı.

## P1 – Finans ve kayıt güvenliği

### P1.1 Banka / BizimHesap güvenli kayıt zinciri

Amaç:

```text
Kanıt → Onay → Queue → Dry-run → Canlı kayıt → Geri doğrulama → Dashboard/Telegram teyit
```

Durum:

- POS/Moka/KMH sınıfları kod tarafında başlatıldı.
- Banka approval status raporu mevcut.
- Pilot banka İş Bankası olarak kilitlendi.

Eksik:

- `BANK_RULES.md` içinde Moka/KMH kurallarının tam doküman doğrulaması.
- BizimHesap queue worker transfer/virman dry-run doğrulaması.
- İlk canlı kayıt için limit 1 güvenli senaryo.

### P1.2 Gmail / banka ekstresi / fatura bildirim merkezi

Amaç:

- Mailden gelen banka ekstresi, kredi kartı, fatura, vergi/SGK, Moka, BizimHesap ve tedarikçi mailleri tek merkezde sınıflansın.

Durum:

- Saatlik Gmail kontrol görevi var.
- MT fatura bildirimi ana kritik özet içine alındı.

Eksik:

- Gmail sinyallerinin dashboard veri kartına bağlanması.
- Fatura/ekstre mailinden otomatik belge kanıtı çıkarma.
- Mükerrer ve sınıflanamayan mail listesi.

## P2 – Veri standardı ve kişisel asistan

### P2.1 Kredi kartı / fatura / abonelik master data

Durum:

- Finans veri standardı yazıldı.
- VakıfBank Ercan şahsi kartları tanımlandı.
- Şahsi finans şirketten ayrı kabul edildi.

Eksik:

- Kart master JSON/Supabase tablosu.
- Fatura/abonelik master tablosu.
- Otomatik ödeme talimatları ve vade uyarıları.

### P2.2 Siri / iPhone Kestirme yedek giriş

Amaç:

- Kullanıcı “Hey Siri, AperiON not al” dediğinde aynı Quick Capture API’ye not düşmeli.

Durum:

- Tasarım dokümana yazıldı.

Eksik:

- `/api/quick-note` endpoint.
- iPhone Kestirme kurulum adımları.
- Sesli nottan parsed ödeme/fatura/görev çıkarma.

### P2.3 WhatsApp Helper

Amaç:

- WhatsApp Business mesaj/dekont/sipariş/fatura görsellerini AperiON’a düşürmek.

Durum:

- Öncelik Telegram/Siri sonrası olarak belirlendi.

Eksik:

- WhatsApp Business/Cloud API veya helper mimarisi.
- Müşteri/tedarikçi mesaj sınıflandırması.
- Görsel/dekont/fatura kanıt akışı.

## Günlük cevap standardı

Her büyük iş sonunda kullanıcıya şu formatta kısa durum verilecek:

```text
Yapılanlar:
Kalanlar:
Riskler:
Sıradaki Adım:
```

Belge/görsel/ekran geldiğinde ayrıca şu bölüm eklenecek:

```text
Kalıcı kayıt önerisi:
```

## Bugünkü aktif bekleme

Telegram Quick Capture hazır olunca kullanıcıya haber verilecek.
Kullanıcı hazır sinyali gelene kadar Telegram botuna yeni test mesajı atmayacak.
