# AA hızlı açılış / Drive + Apps Script — salt okunur hazırlık

## Amaç
Her normal ChatGPT sohbetinde **AA** menüsünü gecikmeden göster; güncel veriyi sorgulamak gerektiğinde Google Drive'da önceden hazırlanmış bir **kanıt özeti** oku. Menü hızı, gerçek BizimHesap veri güncelliği ile KARIŞTIRILMAZ.

## Değişiklik kapsamı
- `google-apps-script/aa-fast-cache/Code.gs`: yalnız yeni/ayrı Apps Script projesine dağıtılmak üzere hazırlanmış bağımsız modül.
- Kaynak tablolara **yalnız okuma**: `A2_SIPARIS_DURUM_MASTER` (satır 12–18 + tarih N2:N9), `A2_BH_FINANS_4_KAYNAK` (2–5).
- Yeni hedef **AA_FAST_CACHE** sekmesinin sadece **B2** (özet JSON) ve **B3** (yenileme sağlığı) hücrelerine yazım; yoksa yalnız bu sekmeyi açar ve kendi başlığını kurar.
- **A1_SNAPSHOT, finans, faturalar, stok, BizimHesap ve diğer betikler kesinlikle değişmez.**
- Kamuya açık `doGet/doPost` bulunmaz; script kullanıcı OAuth yetkisiyle ayrı kurulur.

## Çalışma modeli
1. Kullanıcı **AA** yazar → chat menüsü derhal üretilir; harici dashboard şart değildir.
2. Zamanlayıcı (hedef **her 5 dk**) önceden Drive özeti oluşturur. Bu, **veri kaynağını güncel hale getirmez**, yalnız bilinen son kanıtın okunmasını hızlandırır.
3. `AA_FAST_CACHE!B2` içindeki **cache_refreshed_at** ve **source_observed_on** ayrı okunur.
4. `AA_FAST_CACHE!B3` kontrolü hataysa sonuç **STALE_OR_UNVERIFIED**; 'CANLI' demek yasak.
5. BizimHesap gerçek zamanlı iddiası ancak yetkili API GET, son HTTP/başarılı kaynak çekimi, kapsam, kayıt adedi, GUID, mükerrerlik, kaynak olay saati ve banka-kasa mutabakatı geçince kurulabilir.

## Güvenli etkinleştirme (henüz YAPILMADI)
Bu repo dalının GitHub'a yazılması Apps Script'te kurulum **yapmaz**. Yetkili sahip denetimi sonrasında mevcut çalışan betiği değiştirmeden ayrı Apps Script'e dağıtılacak. Test sırası:
1. `aaFastCacheSelfTest()` → `AA_FAST_SELF_TEST_PASS`.
2. Script OAuth izinleri gözden geçirilir; `aaInstallFastCacheTrigger()` **bir kez** yetkili kullanıcı tarafından çalıştırılır.
3. `AA_FAST_CACHE!B2:B3` geri okunur. Kaynak `A2_SIPARIS_DURUM_MASTER` ile sayılar birebir tutarlı olmalı.
4. İki ardışık zamanlayıcı çevrimi gözlenmeli. `aaReadFastCache().status` yalnız cache yaşı uygun ve son yenileme başarılıysa `CACHE_READY_SOURCE_NOT_LIVE` olur.
5. Belirsiz/eski kaynakta panel **DOĞRULANAMADI** yazar; finansal POST/onay dışı iş yapılmaz.

## Sınır
Apps Script süreleri garanti edilemez; 5 dakika öneri/plan sıklığıdır. ChatGPT normal sohbeti her zaman açık bir soket/arka plan işlemcisi değildir; her yeni istekte bağlayıcı çağrısının gerçek süresi değişebilir. 'Saniyeler içinde' kullanıcı deneyimi için hedef; ölçüm olmadan kanıtlanmış SLA değildir.

**Durum (22 Ekim 2026):** İzole kaynak kod hazır, **production Apps Script dağıtımı / trigger / çift çevrim / gerçek ChatGPT AA entegrasyonu doğrulanmış değil.** Eski genel A1 betiğinin audit tabını silebilme riski nedeniyle mevcut üretim Apps Script'ine dokunulmadı.
