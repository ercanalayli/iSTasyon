# AperiON Üst Akıl — Finans Hafızası ve Vade Motoru

## Amaç
Gmail/Telegram/Drive gibi kaynaklardan gelen finansal belgeleri yalnızca "mail geldi" seviyesinde bildirmek yerine, belgeyi açıp kritik alanları çıkarmak, kalıcı yükümlülük/tahsilat kaydına dönüştürmek, vade/risk üretmek ve ödeme görüldüğünde kapatmak.

## Çalışma klasörü
`C:\AperiON\iSTasyon`

## Kesin güvenlik sınırı
- Gerçek finansal kayıt oluşturma / ödeme / transfer / fatura kesme / BizimHesap write endpointi çağırma: YASAK.
- Bu tur yalnızca belge okuma, ayrıştırma, sınıflandırma, hafıza/veritabanı kayıtları, eşleştirme, durum/risk üretimi ve test fixture'ları ile çalışır.
- Secret/token değerlerini loglama veya commit etme.

## Mevcut altyapıyı yeniden kullan
Önce mevcut kodu incele ve mümkün olduğunca genişlet:
- `functions/shared/financial-document.js`
- `functions/api/financial-document-process.js`
- `functions/telegram/webhook.js`
- `.github/workflows/financial-document-catchup.yml`
- mevcut finance calendar / morning brief / Gmail ingestion / evidence inbox kodları
- mevcut `APERION_DB` / D1 tabloları ve testleri

Yeni paralel sistem kurma; tek kaynaklı mimariyi koru.

## Hedef veri modeli
Mevcut `evidence_inbox` ve `personal_finance_events` yapısını bozmadan, kalıcı finans yükümlülükleri için uygun tablo/alanları ekle. En az şu alanlar tutulabilmeli:
- scope: `ALAYLI | SAHSI | BELIRSIZ`
- obligation_type: `credit_card | tax | sgk | rent | loan | utility | supplier_invoice | subscription | other`
- institution / counterparty
- account/card masked identifier
- statement_date
- due_date
- total_amount
- minimum_amount
- currency
- status: `open | due_soon | overdue | paid | archived | needs_review`
- source/evidence key
- source message id
- document hash / dedupe key
- confidence
- paid_at / matched_transaction_key
- created_at / updated_at

## Belge çıkarımı
Financial document extraction şu belge sınıflarını desteklesin:
1. Kredi kartı ekstresi — toplam dönem borcu, asgari ödeme, son ödeme tarihi, hesap kesim tarihi, maskeli kart.
2. Vergi bildirimi — vergi türü, tutar, son ödeme, başarılı/başarısız tahsilat.
3. SGK bildirimi — dönem, tutar, vade.
4. Kira / kredi / abonelik / telekom faturası — tutar ve vade.
5. Tedarikçi faturası — tedarikçi, tutar, belge tarihi, varsa vade.
6. FAST/EFT/dekont — gelen/giden, karşı taraf, tutar, tarih, referans; açık yükümlülüklerle ödeme eşleştirmesinde kullanılabilsin.

Eksik alan uydurulmasın. Yeterli kanıt yoksa `needs_review`.

## Öğrenilmiş kurallar
Mevcut alias/rule yapısını kullan. Bilinen kişi/kurum kuralı varsa yeni belgede otomatik uygula; ancak kanıtla çelişirse `needs_review`.

Örnek: Furkan Batkı gibi daha önce tanımlanmış personel eşleşmeleri yeni hareketlerde tekrar kullanıcıya sorulmadan öneri olarak uygulanabilmeli. Bu turda gerçek kullanıcı verisini hard-code etme; varsa mevcut kural deposundan oku.

## Vade motoru
Açık yükümlülükler için Europe/Istanbul takvimine göre risk üret:
- >7 gün: normal
- 7 gün: yaklaşan
- 3 gün: yüksek öncelik
- 1 gün / bugün: kritik
- vade geçti ve ödeme eşleşmedi: overdue

Aynı yükümlülük için tekrar tekrar aynı uyarıyı üretme; mevcut risk-warning dedupe yaklaşımını kullan/uyarla.

## Ödeme eşleştirme ve kapanış
Banka/FAST/dekont kaydı geldiğinde açık yükümlülüklerle güvenli şekilde eşleştir:
- aynı kurum/karşı taraf,
- uygun tutar,
- vade çevresindeki tarih,
- kart/hesap/referans kanıtı.

Yüksek güven yoksa otomatik `paid` yapma; `needs_review` oluştur.
Yüksek güvenli fixture/test senaryosunda `open -> paid -> archived` akışını kanıtla.
Gerçek finansal sisteme write yapma.

## Üst Akıl çıktısı
Bir read-only özet endpointi veya mevcut morning brief entegrasyonu şu bilgileri verebilsin:
- bugün ödenecekler
- 3/7 gün içinde vadeler
- gecikenler
- son ödeme ile kapananlar
- ALAYLI / ŞAHSİ / BELİRSİZ ayrımı
- kart, vergi, SGK, kira, kredi özel etiketleri

Örnek beklenti:
`İş Bankası Maximiles ****3904 | ALAYLI | Son ödeme 22.07.2026 | Dönem borcu 123.456 TL | Asgari 49.382 TL | 3 gün kaldı | YÜKSEK`

## Test zorunluluğu
Gerçek mail veya finans sistemi üzerinde write yapmadan fixture'larla en az şu testleri ekle:
1. kredi kartı PDF/metni -> toplam + asgari + vade doğru çıkarım
2. aynı belge ikinci kez -> duplicate oluşmaması
3. eksik vade -> needs_review
4. ödeme dekontu -> doğru açık yükümlülükle eşleşme
5. belirsiz ödeme -> otomatik kapanmama
6. due_soon ve overdue durumları
7. ALAYLI/ŞAHSİ ayrımı
8. financial write = 0 kontrolü

Mevcut `verify:financial-document-v151` testlerini bozma; yeni test komutu ekle ve ikisini de çalıştır.

## Kanıt dosyaları
`state/finance-memory-verification.json` üret. Secret veya kişisel tam hesap numarası içermesin. En az:
- schema_ok
- extraction_tests_passed
- dedupe_ok
- due_engine_ok
- payment_match_ok
- morning_brief_or_summary_ok
- financial_writes: 0
- secrets_exposed: 0

## Dokümantasyon
Tur sonunda güncelle:
- `docs/CURRENT_STATUS.md`
- `docs/CHANGELOG.md`

## Bitirme kriteri
Görev ancak aşağıdakilerin tümü kanıtlanırsa tamamlandı sayılır:
- kredi kartı/vergiler/SGK/fatura vadesi kalıcı hafızaya alınabiliyor,
- yaklaşan/geciken risk hesaplanıyor,
- ödeme eşleşince güvenli kapanış üretilebiliyor,
- üst akıl read-only özetinde görünüyor,
- mevcut finans belge testleri geçiyor,
- yeni testler geçiyor,
- gerçek finansal write = 0,
- secret ifşası = 0,
- commit `origin/main` üzerine gönderilmiş.

## Kullanıcıya final raporu
Sadece şu başlıklarla kısa rapor ver:
1. Yapılanlar
2. Çalışanlar
3. Sorunlar / blokajlar
4. Kanıt dosyaları
5. Commit SHA
6. Sıradaki otomatik adım
