# BizimHesap → AperiON → ÖDE: veri aynası (2026-10-09)

## Kullanıcı kararı
Mevcut Telegram satış bildirim hattı korunacak. BizimHesap kaynak verileri (satış, stok, cari, kasa/banka, ödeme-tahsilat, fatura) ÖDE Google Sheets dosyasındaki **ayrı BH_*** sekmelere salt-okuma kaynak aynası olarak aktarılacak. Para hareketleri / ERP kayıtları otomatik onaylanmayacak.

Kanonik Sheets ID: `1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk`

**Dokunulmayacak:** `1026A` orijinal, `1026K` ödeme planı, `Kurallar`, `ONAY`, `MERKEZ`. BH_* ham veriler ödeme sayfasına ikinci gider/borç eklemez.

## Gerçekten yapılanlar
- ÖDE içinde `BH_SATIS_KALEMLERI`, `BH_STOK_ENVANTER`, `BH_CARI_KARTLARI`, `BH_CARI_HAREKETLERI`, `BH_KASA_BANKA`, `BH_ODEME_TAHSILAT`, `BH_FATURALAR`, `BH_OLAY_GUNLUGU`, `BH_SENKRON_KONTROL` sekmeleri açıldı, başlıklar ve warningOnly düzenleme uyarıları eklendi.
- 2026-08-21 tarihli üç gerçek **tarihsel** `sales_raw` kaydı (kaynak kimlikleri `1400277`, `1400276`, `1400275`) `BH_SATIS_KALEMLERI` satır 5–7'ye aktarıldı. Uçtan uca okunarak doğrulandı; tekrar id çıkarıldı, üç ID eşsiz. `TARİHSEL PİLOT — CANLI DEĞİL` durumundadır. Satışların ciro alanı kaynak `ciro`dur, KDV hariç/dahil türü kanıtlanmamıştır.
- Var olan `BH_CARİ_YÖNETİMİ` 2. satırındaki test şirketi canlı cari değildir. Etiketlendi. Var olan `BH_ÜRÜN_YÖNETİMİ` yalnız şema içeriyor.
- `functions/api/bizimhesap-sheet-export.js`: Cloudflare D1'daki BizimHesap `canonical_events` satırları için **kimlik doğrulamalı, salt-okunur, sayfalı** dışa verme yolu. `Authorization: Bearer APERION_BRIDGE_SECRET` gerekir.
- `functions/api/bizimhesap-event-sync.js`: Windows kaynak okuyucunun stok/cari/fatura/kasa vb. kaynak olaylarını AperiON D1'e güvenli, tekil `event_key` ile gönderebilmesi için **ERP yazması yapmayan** genel olay kabulü.
- `google-apps-script/bizimhesap-ode-mirror/Code.gs`: Apps Script ile 1 dakikalık periyot hedefli, kaynak `event_key` üzerinden idempotent Google Sheets upsert ve canlı kaynak durum kaydı. `appsscript.json` izin dosyası mevcut. Kaynak değişimi/silme mantıksal olarak işaretlenir, eski kanıt silinmez.
- Üç yeni JavaScript dosyası kod-parselleme kontrolünden geçti, GitHub'a commit edildi.

## **ÇALIŞMIYOR / HENÜZ TEST EDİLMEDİ**
**GitHub'a kod yazmak, Google Apps Script'i otomatik çalışır hale getirmez.**
- Cloudflare Pages'in yeni API commitlerini gerçekten deploy ettiği ve yetkili D1 sayfalama çıktısı test edilmedi.
- Apps Script projesi oluşturulup `Code.gs` yüklenmedi, Google OAuth izni ve installBizimHesapMirror zamanlayıcısı verilmedi.
- Script Properties içinde `APERION_BRIDGE_SECRET` bulunmuyor olabilir; **şifreyi Sheet hücrelerine, GitHub'a veya sohbet mesajına kopyalama**. Mevcut Cloudflare secret ile yetkili Apps Script'in script-properties eşleşmesi sağlanmalıdır.
- Kaynak Windows BizimHesap okuyucusunun satış dışı tüm event türlerini beslediği henüz kanıtlanmadı. `stock_raw` 3.285; `sales_raw` 48.924 (son satış 2026-08-21); `bizimhesap_events` 4.029 (2026-09-09'a kadar); `bizimhesap_hesap_hareketleri` 432 (2026-08-09'a kadar) **tarihsel / canlı değil**.
- **Gerçek olayın Telegram'da bildirilip aynı event ID ile Google Sheets'e eklenmesi ve ikinci tetiklemede mükerrer oluşmaması** canlı doğrulama testi bekliyor.

## Güvenli aktivasyon ve kabul testi
1. Aktif Cloudflare Pages sürümünde yeni `/api/bizimhesap-sheet-export` yetkisiz istekleri 401, yetkili istekleri 200 vermeli; hiçbir public PII dökmemeli. Existing /api/bizimhesap-sales-sync ve Telegram bildirimleri etkilenmemeli.
2. Yalnız kullanıcının Google hesabıyla ayrı Apps Script projesi ve Script Properties yetkilendirilip `syncBizimHesapOnce()` **bir kere** çalıştırılmalı. Ardından `installBizimHesapMirror()` time trigger kurmalı. Bu kurulumu yapabilen yetkili araç/saha yoksa operasyonu `AKTİF` diye rapor etme.
3. Bir adet **gerçek yeni kaynak satış eventi** ile kanıt: D1 event_key + BH_SATIS_KALEMLERI A + BH_OLAY_GUNLUGU A eşit ve kaynak tarih/tutar/ürün birebir; duplicate replay'de yeni satır **0**. Yetkili kod süzgecinden gelmemiş ham Telegram mesajına bakarak satış kaydı oluşturma.
4. Stok/cari/banka/evrak her modül için aynı kaynak ID / içerik hash / son görülme / soft delete doğrulamasını uygula. Veri yoksa açıkça `KAYNAK BAĞLANMADI` yaz; gerçek '0' yazma.
5. 1026A/K orijinal aylık ödeme ve açık bakiyeler değişmemiş olmalı. BizimHesap'a hiçbir ödeme/tahsilat/fatura kaydı yazılmamış olmalı.

## Önemli veri güvenliği
- `Code.gs` ve Cloudflare endpoint'te işlenen e-posta/cari/stok/veri kaydı dışarı açık endpointte izinsiz döndürülmez.
- Kaynak verisinden gelen `=`, `+`, `@` önekli metinler Google Sheets formül enjeksiyonuna karşı metin olarak yazılır.
- Tanımlanamayan olay türleri uydurulmuş ödeme/borç olarak değil, yalnız `BH_OLAY_GUNLUGU` içinde izlenir.
- Cloudflare D1/GAS bağlama sırasında şifreleri ChatGPT sohbetine isteme/gönderme.
