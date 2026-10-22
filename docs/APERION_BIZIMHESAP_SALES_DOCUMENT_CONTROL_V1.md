# AperiON — BizimHesap satış / belge / ÖDE denetim protokolü v1
> Taslak iş kuralı. Kaynak kodu PR #85 üzerindedir; canlı Worker, BizimHesap, ödeme veya Google Apps Script dağıtımı değildir.

## Kanıt önceliği
1. BizimHesap'tan bağımsız geri okuma ile doğrulanmış belge GUID/numarası, satır kimliği, güncel durum, tarih, firma ve tutar.
2. İmzalı, zaman damgalı ve mükerrer-korumalı aktarım kaydı, kaynak referansı ve tam satır sayısı.
3. Telegram olayı yalnızca bildirimdir. Google satış aynası yalnızca kopyadır; hiçbiri kendi başına ERP belgesi sayılmaz.
4. Supabase aynasında veri var/yok kararı, son başarılı senkronizasyon zamanına bağlıdır. Eski aynadan 'yok' kararı verilmez.

## Satış kimliği / versiyon
- Belge anahtarı: `firma_id + BizimHesap immutable document GUID`; GUID kanıtlanamıyorsa ERP'nin kalıcı fatura kimliği kullanılabilir, belirsizlik raporlanır.
- Satır anahtarı: kaynak `line_guid/line_id`; yoksa önce güvenli çıkarılabilir kanıt aransın, yalnız ürün+tutarla yeni belge oluşturulmasın.
- `saleFingerprint` dahil fiyat/adet/ciro değişen alanlar **revizyon hash'i** olabilir, belge kimliği değil.
- Aynı belge/satır + yeni hash => CHANGE_EVENT old->new; aynı belge/satır + aynı hash => DUPLICATE.
- ERP üzerinde silme/iptal iddiası için tüm sayfa/satırları kapsayan tam kaynak taraması ve karşılaştırma + silinen durumun kanıtı gerekir. Eksik taramada `SUSPECTED_REMOVAL` dışında kesin hüküm yok.
- Sipariş, belge, tahsilat, iade ve iptal olayları ayrı tiplerdir. Her olay ayrı zaman, kaynak ve kimlik alır.

## Güvenli ingest
1. Kaynak okuma → imzalı tam payload → doğrulama (SHA-256, HMAC, kısa zaman penceresi) → event append.
2. Tekil olay anahtarını tüm geçmişe göre ve atomik kilitle denetle.
3. Alıcı cevabını `ok===true`, doğru sheet ve kesin `appended + duplicates === gönderilen` şartıyla doğrula. HTML / boş / eksik yanıt başarısızdır.
4. Her kanalı ayrı izlensin: `telegram_sent`, `sheet_written`, `erp_verified`, `snapshot_fresh`; Telegram başarısı Sheets başarısı sayılmaz.
5. Hata için gerekçe ve backoff/retry kaydı; sır, müşteri belge fotoğrafı ve tokenlar loglara konmaz.
6. Canlı sisteme yayından önce test: doğru imza, hatalı imza, eskimiş zaman, mükerrer teslim, yanlış tutar, eksik ack, eşzamanlı teslim, kaynak sayfa eksikliği, geri alma.

## Fotoğraf/belge geldiğinde
1. Orijinal fotoğrafı kayıp/kalite durumuyla sakla; belge tipi ve yönünü saptamaya çalış: satış, alış, gider, gelir, çek/senet, banka/kart dekontu veya belirsiz.
2. Belge alanları: firma, karşı taraf, VKN/kimlik **yalnız yetkili kayıt alanında**, belge no/tarih/vade, para birimi, KDV/tevkifat, toplam, ödeme kanıtı; görünmeyen alana `BİLİNMİYOR`.
3. BizimHesap'ta önce mevcut kayıt kontrolü: belge GUID/no, cari, tutar, tarih, tür; eski/stale API aynası yerine bağımsız güncel kaynak gerekir. Eksik kanıt `ERP_KONTROL_BEKLİYOR`.
4. Zaten kayıt varsa **ikinci gelir/gider/fatura oluşturma**. Orijinal fotoğrafı aynı kayıtla ilişkilendirmek için geri okuma kanıtı hazırla.
5. ÖDE'de yalnız doğrulanmış kimliğe bağlı, benzersiz `document_key` ile `TASLAK` hazırlanır; ödeme durumu banka/kart/ERP mutabakatı yoksa `ÖDENMEDİ` veya `ÖDENDİ` diye kesin yazılmaz; `DURUM_BELİRSİZ`.
6. Kaydedilen orijinal belge Drive dosya ID/URI, SHA-256, ERP GUID ve ÖDE satır/case ID ile çift yönlü bağlanmalı. Arşiv kaydı gerçekten oluşturulmadıysa arşivlendi denmez.
7. Muhasebe finansal POST, ödeme, virman, iptal, stok düzeltme veya fatura değişikliği yalnız işleme özel açık onay + mükerrer engeli + ERP geri okumasından sonra.
8. Sohbet sonucu: kaynak doğrulama tarihi, hangi kayıt eşleşti, ÖDE taslak/gerçek durumu, Drive orijinal kanıt durumu, engeller ve sıradaki adım.

## Kullanıcıya gösterilecek durum renkleri
- 🟢 `ERP_DOGRULANDI` / `BAGLANTI_KANITLI`: bağımsız source readback mevcut.
- 🟡 `ESLESTIRME_BEKLIYOR` / `ODE_TASLAK`: işlem hazırlığı, doğrulanmış finansal kayıt değil.
- 🔴 `MUKERRER_RISK` / `KAYNAK_ESKI` / `KAYIT_ENGELLI`: işleme devam edilmez.
- ⚪ `BILINMIYOR`: eksik alan, kesin sıfır veya yok anlamına gelmez.

## Kaynak/fonksiyonel eksikler — 14 Ekim 2026
- `BIZIMHESAP_CANLI_SATIS` başlıklardan ibaret; git PR #85 source fix **henüz canlı uygulama değil**.
- Supabase `sales_raw` en yeni kaynak belge tarihi 2026-08-21; `bizimhesap_events` 2026-09-09.
- Kod hâlen fiyat/adet bağlı `saleFingerprint` kullanıyor; gerçek satır GUID'si ve tam dönem taraması teslim edilmedi.
- Bu sohbetten her normal ChatGPT sohbetinin oturumdaki Tampermonkey'e çalışır yazma kanalı henüz doğrulanmamıştır; çapraz sohbet kanonik Sheets okuma ile açıklanabilir, otomatik finansal yazma iddia edilmez.
