# CODEX MASTER PROMPT — AperiON iSTasyon

Bu dosya tek ve birleşik görev promptudur. Ayrı ayrı prompt kullanılmayacak. Codex bu dosyayı ana talimat olarak okuyacak.

## Proje

Repo: `ercanalayli/iSTasyon`

Canlı kokpit: `https://aperion-istasyon.pages.dev/aperion-home-v3.html`

AperiON bir muhasebe ekranı değil; CFO / COO operasyon kokpitidir.

Ana amaç:

- Bugün ne kritik?
- Neyi görmezsek para kaybederiz?
- Hangi işlem onay bekliyor?
- Hangi ödeme, fatura, banka, kart veya abonelik riski var?

## Ana iletişim kanalı

Telegram, AperiON'un ana iletişim ve kontrol kanalıdır.

Telegram üzerinden:

- hızlı not
- ödeme bildirimi
- fatura bildirimi
- görev girişi
- alarm
- banka işlemi onayı
- işlem sonucu teyidi
- hata bildirimi
- günlük kritik özet

yönetilecek.

Dashboard ana kokpittir; Telegram kullanıcıyla aktif iletişim katmanıdır.

## Değişmez güvenlik zinciri

`Kanıt → Kullanıcı onayı → Queue → Dry-run → Canlı kayıt → Geri doğrulama → Dashboard/Telegram teyidi`

Kullanıcı açık onayı olmadan BizimHesap'a finansal kayıt yazılmayacak. İlk canlı denemeler tek kayıt ve limit 1 ile yapılacak.

## Telegram hazır olma kriteri

Kullanıcıya hazır olmadan test yaptırılmayacak.

`/api/telegram-preflight` sonucu aşağıdaki durumda olmalı:

- `ok=true`
- `ready_for_user_test=true`

Bu koşullar sağlanmadan kullanıcıdan `/start` veya test mesajı istenmeyecek.

## Telegram giriş türleri

Gelen mesaj mümkün olduğunca şu türlerden birine ayrılmalı:

- quick_note
- payment_note
- invoice_note
- task
- approval_response
- reminder
- unknown

Her girişte mümkünse şunlar çıkarılmalı:

- ALAYLI / ŞAHSİ / BELİRSİZ
- tarih
- tutar
- kurum / kişi / cari
- ödeme yöntemi
- banka / kart / kasa kaynağı
- son ödeme tarihi
- risk
- kanıt durumu

Eksik bilgi varsa yalnızca eksik alan sorulmalı. Aynı bilgi tekrar sorulmamalı.

## Telegram cevap standardı

Kısa fakat karar vermeye yeterli cevap dönmeli:

- alındı
- sınıf
- tür
- tutar
- tarih
- durum
- kayıt numarası

Finansal onay mesajında banka, hesap, tarih-saat, tutar, açıklama, karşı taraf, kaynak hesap, hedef hesap, referans, bakiye, belge kaynağı, ham ekstre satırı, risk ve önerilen işlem tipi bulunmalı.

Sadece tutar veya kısa özet ile onay istenmeyecek.

## Kalıcı kart mantığı

Kullanıcının gönderdiği ekran görüntüsü, belge, fatura, banka ekranı, kredi kartı, abonelik, ödeme talimatı, dekont veya ekstre kalıcı veri adayıdır.

Uygun kart tipleri:

- Abonelik Kartı
- Banka Hesabı Kartı
- Kredi Kartı Kartı
- Sanal Kart Kartı
- Ödeme Talimatı Kartı
- Fatura Kartı
- Cari / Tedarikçi Kartı
- Kira Gider Kartı

Hassas veriler public repo içine açık yazılmayacak.

## ALAYLI gider hafızası

`masraf.xlsx` analizi ALAYLI gider öğrenme referansıdır.

Ana sınıflar:

- Personel giderleri
- Araç giderleri
- İşletme giderleri
- Mali giderler
- Ticari ürün / tedarikçi alışları
- Diğer / kontrol bekleyen

Kurallar:

- Her satır için kullanıcıya soru sorulmaz.
- Sadece belirsiz, riskli veya yanlış sınıflanmış kayıt sorulur.
- Gider sınıfı ile ödeme kaynağı ayrı tutulur.
- Şahıs üzerinden yapılan ALAYLI giderlerinde ödeme kaynağı ayrıca işaretlenir.
- Kira kayıtları gelir değil giderdir.

Güncel sabit kira gideri:

- aylık toplam: 130.000 TL
- elden: 55.000 TL
- banka: 75.000 TL

## Banka ve kart envanteri

ALAYLI banka ve kartları maskeli kartlar olarak yönetilmeli.

Kapsam:

- VakıfBank
- Yapı Kredi
- Garanti BBVA
- İş Bankası
- kredi kartları
- sanal kredi kartları
- otomatik ödeme talimatları

İzlenecek alanlar:

- bakiye
- kullanılabilir bakiye
- blokeli tutar
- limit
- kullanılabilir limit
- güncel borç
- ekstre borcu
- hesap kesim tarihi
- son ödeme tarihi
- ek hesap riski

Tam kart ve hesap bilgileri public dosyalara yazılmayacak.

## Abonelik ve otomatik ödeme takibi

Her abonelik için:

- fatura geldi mi
- son ödeme tarihi yaklaştı mı
- ödeme kaynağında yeterli bakiye / limit var mı
- otomatik ödeme gerçekleşti mi
- banka veya kart hareketinde göründü mü
- fatura kapandı mı
- dashboard ve Telegram özetine işlendi mi

kontrol edilecek.

## Banka sınıflandırma kuralları

POS kredi kartı tahsilatlarının ertesi gün bankaya yatması tahsilat değildir; transferdir.

- kaynak hesap: `POS POS POS KREDI KARTI`
- hedef hesap: paranın yattığı banka hesabı
- işlem tipi: transfer / bank_transfer

Güven yüksek olsa bile kullanıcı onayı olmadan BizimHesap'a yazılmayacak. Onay ekranında hedef hesap zorunlu gösterilecek.

Moka banka yatışlarında tahsilat ile banka geçişi karıştırılmayacak.

## AperiON kokpit

Ana dosya: `aperion-home-v3.html`

Ana alanlar:

- Kritik Durum
- Bankalar
- BizimHesap İşleme
- Telegram Sağlığı
- Gmail Sinyalleri
- Moka / POS
- Kredi Kartları
- Faturalar / Abonelikler
- Giderler
- Kira Giderleri
- Şahsi Finans
- Riskler
- Tamamlananlar
- Sistem Sağlığı

Her kartta minimum:

- ALAYLI / ŞAHSİ / GENEL
- iyi / uyarı / kritik / bekliyor
- sayı veya tutar
- son kontrol zamanı
- en yüksek risk
- kanıt var / yok
- aç butonu

Telegram sağlık kartı mutlaka eklenmeli.

## Canlı veri

Dashboard sabit metin yerine JSON veya Supabase view okumalı.

Öncelikli kaynaklar:

- banka approval status
- Telegram preflight / webhook health
- quick notes
- payment promises
- kredi kartı durumları
- abonelik / otomatik ödeme durumları
- gider hafızası durumu
- sistem sağlığı

Veri yoksa sahte rakam gösterme; `veri bekleniyor` yaz.

## Çakışma önleme

Aynı dosyada aynı anda iki ayrı çalışma yapılmayacak.

Codex önceliği:

- `functions/telegram/`
- `telegram/`
- Telegram webhook
- Telegram preflight
- Telegram watchdog
- quick capture akışı
- Cloudflare Telegram endpointleri
- testler

`aperion-home-v3.html` körlemesine yeniden yazılmayacak. Mevcut tasarım ve kartlar korunacak.

## Önce okunacak dosyalar

- `docs/START_HERE.md`
- `docs/SESSION_STATE.md`
- `docs/NEXT_ACTION.md`
- `docs/EXECUTION_QUEUE.md`
- `docs/TELEGRAM_RULES.md`
- `docs/BANK_RULES.md`
- `docs/FINANCIAL_DATA_STANDARDS.md`
- `docs/MASTER_DATA_CARD_SCHEMA.md`
- `docs/EXPENSE_CLASSIFICATION_RULES.md`
- `docs/CODEX_HANDOFF_TELEGRAM_FIRST.md`
- `docs/CODEX_PROMPT_TELEGRAM_PRIMARY_CHANNEL.md`
- `aperion-home-v3.html`
- `functions/telegram/webhook.js`
- `functions/api/telegram-preflight.js`
- `tools/ensure_telegram_webhook.cjs`
- `.github/workflows/telegram-watchdog.yml`

## Gizli ayarlar

Gizli değerler hiçbir zaman loga, dosyaya veya commit içine yazılmayacak. Eksik ayar varsa preflight açık şekilde eksik ayar bildirmeli.

## Test zorunluluğu

En az şu testler yapılmalı:

1. health / preflight
2. Telegram update parser
3. `/start`
4. düz metin quick note
5. ödeme notu
6. eksik bilgi
7. duplicate update
8. veri yazma hatası
9. kullanıcı teyit mesajı
10. onaysız finansal kayıt yapılmadığı

Çalıştırılmamış test geçmiş gibi gösterilmeyecek.

## Tamamlanma kriteri

İş ancak şunlar sağlanınca tamamdır:

- Telegram webhook canlı
- preflight hazır
- `/start` cevap veriyor
- düz mesaj kayda dönüşüyor
- kullanıcıya teyit dönüyor
- ALAYLI / ŞAHSİ ayrımı çalışıyor
- dashboard Telegram sağlığını gösteriyor
- duplicate kontrolü var
- hata loglanıyor
- finansal işlem kullanıcı onaysız BizimHesap'a gitmiyor

## Çalışma biçimi

- Önce repo durumunu oku.
- Çalışan yapıyı bozma.
- Küçük ve doğrulanabilir commitler yap.
- Her commit sonrası ilgili testi çalıştır.
- Hazır olmayan sistemi kullanıcıya test ettirme.
- İş sonunda tek rapor ver:
  - Yapılanlar
  - Değişen dosyalar
  - Testler ve sonuçları
  - Kalanlar
  - Riskler
  - Kullanıcının yapması gereken tek zorunlu işlem

Bu dosya AperiON için tek ana Codex promptudur. Ayrı promptlar ikincil kabul edilir.
