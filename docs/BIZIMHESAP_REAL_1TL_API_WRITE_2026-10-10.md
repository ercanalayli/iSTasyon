# BizimHesap API – Gerçek 1 TL üretim hesabı testi (10.10.2026)

**Açık kullanıcı onayı:** 10 Ekim 2026, bugün tarihli, 1 TL'lik gerçek test faturasının, cari ve ürün kaydının denenmesini ve yalnızca bu test faturasının iptalinin sınanmasını istedi. Test kayıtlarının sonradan kendisi tarafından silinebileceğini söyledi.

**Firma:** Entegrasyonda seçili ALAYLI; özel FirmId ve token GitHub'a gönderilmedi.
**Deneme etiketi:** `APERION API TEST 20261010 2152`
**Yöntem:** Canlı BizimHesap B2B; Supabase'in mevcut `integrations` satırındaki kimlik bilgileri; ham sırlar dışarı çıkarılmadı.

## Gerçek kayıt ve geri okuma

| İşlem | Doğrudan API sonucu | Geri okuma | Karar |
|---|---|---|---|
| POST /addcustomer, CustomerName=APERION API TEST 20261010 2152 CARI | HTTP 500, `Object reference not set to an instance of an object.` | Daha sonra 1 TL fatura aracılığıyla *otomatik* oluşturulan test cari GET /customers'da göründü; doğrudan addcustomer sonucu değildir | Bağımsız müşteri oluşturma KANITLANMADI |
| POST /addproduct, ProductName=APERION API TEST 20261010 2152 URUN | HTTP 200, `resultCode:1` | GET /products: 3035 → 3036, tek eşleşme, ürün ID `D96E3752EEBE4DAB90C64159ED45E24D` | **KAYIT OLUŞTU; ALAN EKSİKLİĞİ VAR** |
| POST /addinvoice, invoiceType=3 (satış), bugün (Europe/Istanbul), `amounts.total=1.00`, `net=0.83`, `tax=0.17`, test cari + test ürün | HTTP 200; `error:''`, GUID `14A652F2FD1F4432910BC799E02F0AB7` ve BizimHesap printout URL döndü. `eInvoiceNo` boş. | GET /customers 5782→5783, test müşteri tek eşleşme, ID `A7205D1D322544C69086FF984486F8AE`. Fatura görüntüleme URL'si GET HTTP 200 HTML döndürdü ancak içerikte test etiketi/tutar bulunamadı, böylece gerçek faturanın *kayıtlı toplamı* bağımsız doğrulanamadı. | **API KAYIT GÜVENİLİR GÜİD/YANIT KANITIYLA OLUŞTU, FATURA TOPLAMI GERİ OKUMA EKSİK** |
| POST /cancelinvoice, GUID yalnızca yukarıdaki test faturasına | İşlem aracı yürütme güvenlik kontrolünde ENGELLENDİ; POST gönderilmedi | İptal kanıtı yok; fatura açık kabul edilmeli | **İPTAL YAPILMADI** |

### Alan seviyesi kritik bulgu
- `addproduct` için gönderilen `SalePrice=1` ve `Code=APERIONTEST101026` alanlarına rağmen gerçek ürün GET verisinde `price=0.0000` ve `code=''`. Yani yalnızca ürün **oluşturma** doğrulandı; fiyat ve kod güncelleme/doğru eşleşmesi **başarısız**. KDV `tax=20.00`, `isActive=1`.
- `addinvoice` girişinde 1 TL toplam gönderildi ve GUID döndü; resmî kaynak üzerinden toplamın 1 TL olduğu ayrı bir geri okuma ile kesinleştirilemedi.
- Fatura **e-Fatura olarak gönderildi** iddiası yok. `eInvoiceNo` boş döndü.

## Temizlik gerektiren kayıtlar (kullanıcının silebilmesi için)

**Test ürün:**
- Ad: `APERION API TEST 20261010 2152 URUN`
- ID: `D96E3752EEBE4DAB90C64159ED45E24D`
- `price=0.0000` (istenen 1 TL fiyat uygulanmadı)

**Test cari:**
- Ad: `APERION API TEST 20261010 2152 CARI`
- ID: `A7205D1D322544C69086FF984486F8AE`
- Kaynak kod: `APERIONTESTC1010262152`

**Test fatura / satış kaydı:**
- Açıklama: `APERION API TEST 20261010 2152 - 1 TL tutarli kullanici onayli entegrasyon testi, gercek satis degil`
- ID: `14A652F2FD1F4432910BC799E02F0AB7`
- Kaynağın döndürdüğü adres: https://uygulama.bizimhesap.com/web/ngn/doc/printout?rc=1&id=14A652F2FD1F4432910BC799E02F0AB7&tp=464822087F27499C99A9D177CECE9E6E
- **İptal edilmedi / silinmedi.**
- Manuel silme veya iptal işlemi sonrasında muhasebe ve e-belge durumunun kontrolü gerekebilir; kayıtların gerçekten kaldırıldığı **varsayılmamalı**.

## AperiON kalıcı kabul standardı
- **API başarılı** demek için kod/yol değil, canlı kaynak yanıtı gerekir.
- **Tam alan doğrulaması** için kaynak GET'de işlem ID + fiyat/vergi/tutar/kategori birebir okunmalı.
- Mükerrerliği önlemek için test etiketini yeni POST'larda **bir daha kullanma**.
- Kullanıcı onayı sonraki faturalar için genel sınırsız yetki sayılmaz.
- **Finansal kayıt denemesi tekrar sayısı: 1.** Hata/HTTP 500 sonrası kör tekrar yok.
- `functions/shared/bizimhesap-api-capabilities.js` kayıtlı yeni kabul düzeyiyle güncellendi.

## Kaynak
- Vendor: https://apidocs.bizimhesap.com/addinvoice.md
- Otomatik yönlendirme testleri: https://github.com/ercanalayli/iSTasyon/actions/runs/38077412825
