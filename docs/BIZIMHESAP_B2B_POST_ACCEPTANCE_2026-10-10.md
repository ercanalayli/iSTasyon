# BizimHesap B2B – Dört POST metodunun gerçek ortam kabul testi
**Tarih:** 2026-10-10, Europe/Istanbul
**Hedef:** Kullanıcının “Henüz yapılmadı dediklerinin hepsini yap test et” talebi.
**Ortam:** Gerçek BizimHesap API; gerçek kayıt yazma YOK.
**İşlem sayısı:** 4 OPTIONS + 4 geçersiz JSON POST; 0 geçerli fatura/müşteri/ürün/iptal isteği.

## Canlı kanıtlar

| Operasyon | Resmî genel doküman | OPTIONS sonucu | Yanlış JSON POST sonucu | Gerçek kayıt/iptal |
|---|---|---|---|---|
| /addinvoice | Evet: sipariş/fatura ekleme, otomatik cari ve ürün yaratma ihtimali | HTTP 405, Allow: POST | HTTP 200, JSON hata: `Hatalı istek, lütfen gönderdiğiniz json veriyi kontrol edin`, guid boş | YAPILMADI |
| /cancelinvoice | Kamuya açık dizinde yok, mevcut AperiON'da uygulama var | HTTP 405, Allow: POST | HTTP 500, `Object reference not set to an instance of an object.` | YAPILMADI |
| /addcustomer | Kamuya açık dizinde yok, mevcut AperiON'da uygulama var | HTTP 405, Allow: POST | HTTP 500, aynı null-object hatası | YAPILMADI |
| /addproduct | Kamuya açık dizinde yok, mevcut AperiON'da uygulama var | HTTP 405, Allow: POST | HTTP 500, aynı null-object hatası | YAPILMADI |

**Önemli:** Yanlış JSON işlemleri bilerek seçildi. Gerçek kullanıcı, ürün, fatura veya iptal kaydı gönderilmedi. Sunucu dört metodun POST olarak tanımlandığını doğruladı; **POST için yetki ve gerçek kayıt başarıyla kanıtlanmadı**. `addinvoice` geçersiz girdiyi düzgün reddetti; diğer üçü sunucu hatası gösterdi. Geçerli istekler aynı sonuçları verecek varsayılamaz.

## Mevcut canlı okuma doğrulamaları
- `GET /products`: `resultCode=1`, 3.035 ürün.
- `GET /warehouses`: `resultCode=1`, iki depo.
- `GET /inventory/{depo-id}`: `resultCode=1`, ilk depo stokları.
- `GET /customers`: `resultCode=1`, 5.782 müşteri.
- `GET /suppliers`: `resultCode=1`, canlı sonuç.
- `GET /abstract/{customer-id}`: HTTP 429; henüz kanıtlanmadı, tekrar zorlanmamalı.

## AperiON'a kodla eklenen API-öncelikli kural
- `functions/shared/bizimhesap-api-capabilities.js`: 11 API operasyonu envanteri + belgelilik/canlı kanıt/risk sınıfı.
- `functions/telegram/universal-command-router.js`: Finansal komutlara `apiPreference` kararı ekler. Resmî API erişimi bulunmayan gider/kasa/tahsilat API'si varmış gibi gösterilmez. Akaryakıt kategorisi `Genel Gider` yerine `Akaryakıt` olarak çözülür.
- **Dört POST** yolunda `canExecute:false` zorunlu; yalnızca kanıtlanmış işlem motorunda tekil onay, idempotency ve ERP kaynak kimliğiyle geri okuma sonrası açılabilir.
- `tools/test_bizimhesap_api_first_v163.mjs`: 17 otomatik test; mevcut Telegram komut regresyon testi de başarılı.
- GitHub Actions kanıtı: https://github.com/ercanalayli/iSTasyon/actions/runs/38077412825

## Gerçek yazmayı denemeden önce eksik kritik veriler
Geçerli işlem alanları, işlenecek şirket ve kaynak kayıt ID eşleştirmeleri; fatura için gerçek veya açıkça ayrılmış sandbox alıcı ve satırlar, ayrıca tutar ve vergi; iptal için iptal edilebilecek kaynak fatura kimliği; müşteri ve ürün için gerçekte oluşturulması istenen onaylı kayıt bilgileri; kayıt sonrası kaynağa geri okuma ve silme/iptal prosedürü.

**NO-GO:** Sandbox veya kullanıcının açıkça seçtiği gerçek kayıtlar olmadan üretim ortamında sahte cari/ürün/fatura oluşturma veya mevcut faturayı deneme amacıyla iptal etme.

**Kabul kararı:** Dört metot *mevcut*; güvenli doğrulama testleri ve AperiON politika kodu *geçti*. Dört işlemin gerçek ERP yazma kabiliyeti **HENÜZ KANITLANMADI**.
