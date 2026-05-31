# AperiON iSTasyon — v57 Yol Haritası ve Süre Tahmini

Bu dosya PR #2 kapsamında, AperiON’un kısa ve orta vadeli geliştirme yolunu netleştirmek için eklendi.

## Ana vizyon

AperiON; ALAYLI Medikal’in banka, kasa, Moka/POS, cari, satış, ürün, stok, gider, onay, rapor ve BizimHesap entegrasyonunu yöneten üst akıl finans ve ERP komuta merkezi olacak.

İlk hedef tam ERP yazmak değil; en hızlı değer üreten alanları canlıya almak:

1. Nakit Komuta Merkezi
2. Banka Ekstre Onay Merkezi
3. Moka/POS Takip Merkezi
4. Günlük Finans Raporu
5. BizimHesap dry-run kayıt kuyruğu

## Değişmez kurallar

- Aktif şirket ilk aşamada yalnızca `ALAYLI Medikal`.
- Diğer şirketler pasif mimaride kalabilir ama varsayılan dashboard’da görünmez.
- Onaysız hiçbir kayıt kesin finans kaydına dönüşmez.
- BizimHesap’a doğrudan kontrolsüz kayıt gönderilmez.
- Önce dry-run, sonra onay, sonra log, sonra kesin kayıt mantığı kullanılacak.
- Veri yoksa hesap uydurulmaz; ekranda `eksik veri` yazılır.
- Sayılar tam görünür; K/M kısaltma kullanılmaz.
- Mevcut özellikler silinmez.
- Deploy ve merge ayrıca onay ister.

## Sprint v57 — Nakit Komuta Merkezi

### Amaç

ALAYLI Medikal için günlük nakit durumunu tek ekranda görmek:

- Eldeki banka + kasa
- Moka/POS bekleyen tahsilatlar
- Bugün gelecek / ödenecek
- Bu hafta gelecek / ödenecek
- Bu ay gelecek / ödenecek
- Ay sonuna kadar net nakit
- Onay bekleyen hareketler
- Moka/POS beklenen taksitler
- Nakit açığı riski

### v57 kapsamına alınan dosyalar

- `finance/AperiON_Cash_Command_Center_SQL_v57.sql`
- `tools/verify_cash_command_center_v57.cjs`
- `services/bank_mail_reader_v57.cjs`
- `services/bank_statement_parser_v57.cjs`
- `services/bank_transaction_matcher_v57.cjs`
- `tools/verify_cash_command_services_v57.cjs`
- `local_bot/aperion_remote_command_bot_v57.cjs`
- `tools/apply_cash_command_ui_v57_patch.cjs`
- `tools/verify_cash_command_ui_v57.cjs`
- `nakit-komuta-v57.html`
- `.github/workflows/apply-cash-command-ui-v57.yml`

## Pratik süre tahmini

### 1. Nakit Komuta Merkezi preview

Tahmini süre: 1-2 gün.

Durum:

- SQL foundation hazır.
- Banka servis hazırlığı hazır.
- Bağımsız preview ekranı hazır.
- GitHub workflow hazır.

Kalan:

- Ana ekrana güvenli link.
- Supabase SQL kurulumu.
- Gerçek veriyle kontrol.

### 2. Banka Ekstre Onay Merkezi MVP

Tahmini süre: 1-2 hafta.

Kapsam:

- Mail veya manuel yüklenen banka ekstresi okunacak.
- Ham hareketler kaydedilecek.
- İşlem türü önerilecek.
- Cari eşleştirme önerilecek.
- Onay bekleyen kayıt üretilecek.
- Onaylanınca AperiON klon deftere geçecek.

### 3. Moka/POS Takip Merkezi MVP

Tahmini süre: 3-7 gün.

Kapsam:

- Moka/POS tahsilatı kaydı.
- Taksit sayısı.
- İlk taksit 40 gün sonra.
- Sonraki taksitler kural tarihçesine göre hesaplanacak.
- Bugün / hafta / ay beklenen Moka tahsilatı raporlanacak.

### 4. BizimHesap dry-run kayıt kuyruğu

Tahmini süre: 1-2 hafta.

Kapsam:

- Onaylanan hareket için BizimHesap’a gönderilecek kayıt önerisi oluşacak.
- Önce dry-run çalışacak.
- Başarılı / başarısız loglanacak.
- Gerçek kayıt için ayrıca onay gerekecek.

### 5. Günlük Telegram Finans Raporu

Tahmini süre: 2-5 gün.

Kapsam:

- Bugünkü nakit durumu.
- Bugün gelecekler.
- Bugün ödenecekler.
- Moka/POS bekleyenler.
- Onay bekleyen hareketler.
- Kritik riskler.

### 6. Geniş ERP / üst akıl sistemi

Tahmini süre: 6-12 ay.

Kapsam:

- Ürün kârlılığı.
- Stok zekâsı.
- Fiyat analizi.
- Cari risk.
- Kişisel finans.
- Agent Hub.
- Satın alma.
- Pazarlama ve yönetim raporları.

## Daha kısa ve güvenilir yöntem

AperiON’un kısa vadede BizimHesap’ın yerine geçmesi yerine, önce BizimHesap’ın üstünde çalışan üst akıl olması daha güvenli:

```text
BizimHesap = kayıt merkezi
AperiON = veri okuma + eşleştirme + onay + analiz + rapor + üst akıl
```

Sonra AperiON kendi klon kayıt omurgasını güçlendirir.

## PR #2 için kabul kriterleri

PR #2 merge edilmeye hazır sayılmadan önce:

- v57 SQL verify geçmeli.
- v57 servis verify geçmeli.
- Nakit Komuta preview sayfası açılmalı.
- Ana ekrana güvenli link eklenmeli veya ayrı preview linki belgelenmeli.
- Deploy yapılmadan önce kullanıcı onayı alınmalı.
- Supabase kurulum notu açık olmalı.
- Eksik veri durumunda ekran uydurma hesap yapmamalı.

## Yapılanlar

- v57 SQL foundation oluşturuldu.
- v57 banka/mail/parser/matcher servisleri oluşturuldu.
- v57 verify scriptleri oluşturuldu.
- Remote command bot dosyası eklendi ancak Telegram token/chat id bağlantısı park edildi.
- Nakit Komuta UI patch/verify araçları eklendi.
- Bağımsız Nakit Komuta preview ekranı eklendi.
- GitHub Actions manuel UI uygulama workflow’u eklendi.

## Kalanlar

- Ana `index.html` içine güvenli Nakit Komuta linki.
- Supabase v57 SQL kurulumu.
- Gerçek banka ekstresi testi.
- Moka/POS gerçek taksit testi.
- Onay Merkezi ekran bağlantısı.
- BizimHesap dry-run kuyruğu.
