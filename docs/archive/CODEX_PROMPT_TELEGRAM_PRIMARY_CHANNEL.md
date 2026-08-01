# Codex Görevi – Telegram Ana İletişim Kanalı

AperiON iSTasyon artık CFO/COO kokpitidir. Kullanıcının günlük iletişim kanalı Telegram olacaktır. Bu görevde Telegram hattını kullanıcı testine gerçekten hazır hale getir.

## Çalışma alanı

Sadece aşağıdaki alanlarda çalış:

- functions/telegram/
- telegram/
- tools/ensure_telegram_webhook.cjs
- .github/workflows/telegram-watchdog.yml
- Telegram quick capture için gerekli Supabase migration dosyaları

Aşağıdaki dosyalara dokunma:

- aperion-home-v3.html
- giderler.html
- mevcut finans dashboard dosyaları

## Hedef

Telegram'a yazılan düz metin şu türlerden birine ayrılsın:

- quick_note
- payment_note
- invoice_note
- task_note
- approval_command
- unknown

Her mesaj tek kez kaydedilsin. Mükerrer anahtar chat id ve message id birleşiminden üretilecek.

## Zorunlu akış

1. Gelen Telegram update doğrulansın.
2. Düz metin parse edilsin.
3. ALAYLI, ŞAHSİ veya BELİRSİZ sınıfı belirlensin.
4. Supabase quick capture kaydı oluşturulsun.
5. Kullanıcıya kısa teyit dönsün.
6. Finansal işlemse kullanıcı onayı olmadan BizimHesap kaydı yapılmasın.
7. Hata olursa sessizce kaybolmasın; log ve sağlık durumuna yazılsın.

## Teyit örneği

ALINDI – APERION
Tür: Ödeme
Sınıf: ALAYLI
Karşı taraf: Sena Medikal
Tutar: 100.000 TL
Vade: 10.07.2026
Durum: Takip ve onay kuyruğuna alındı

Belirsiz alan varsa yalnızca eksik alan sorulsun.

## Hazır kabul şartı

Preflight endpoint aşağıdakini doğrulamadan kullanıcıya test yaptırma:

- webhook endpoint erişilebilir
- bot kimliği doğrulanmış
- veri tabanı bağlantısı çalışıyor
- quick capture tablosu erişilebilir
- webhook doğru adrese bağlı
- ready_for_user_test true

## Watchdog

Watchdog:

- webhook adresini kontrol etsin
- kopuksa yeniden bağlasın
- Telegram tarafındaki son hatayı raporlasın
- endpoint sağlık kontrolünü yapsın
- başarısızsa workflow kırmızı olsun

## Güvenlik

- Token veya erişim anahtarını kaynak koda yazma.
- Public dosyada hassas değer bırakma.
- ŞAHSİ kayıtları ALAYLI'ye otomatik bağlama.
- Kullanıcı onayı olmadan finansal kayıt üretme.
- Aynı mesajı iki kez kaydetme.

## Testler

En az şu testleri ekle:

- start komutu cevap verir
- düz not kaydı oluşur
- ödeme notu parse edilir
- aynı message id ikinci kez kaydedilmez
- veri tabanı erişilemezse anlamlı hata döner
- eksik ortam ayarında preflight false döner
- hazır ortamda preflight true döner

## Çıkış raporu

İş bitince şu formatta rapor ver:

Değiştirilen dosyalar:
Eklenen testler:
Kalan ortam ayarları:
Preflight sonucu:
Webhook sonucu:
Kullanıcı testine hazır mı:
Kalan riskler:
