# AperiON × BizimHesap — modül bazlı canlı kabul testleri

**Rapor tarihi:** 2026-10-10 (Türkiye)
**Hedef firma:** ALAYLI / BizimHesap
**Kapsam:** Okuma, işlem hazırlama, kullanıcı onayı, tekil kayıt, tekrar okuma ve mükerrerlik kontrolü.
**Durum:** KISMİ KANIT; TAM UÇTAN UCA KABUL EDİLMEDİ.
**Güvenlik:** Bu testler BizimHesap'a hiçbir finansal kayıt yazmamıştır. Şifre, API tokenı, session cookie veya gerçek cari verileri kaynak kodunda/raporda yayımlanmamıştır.

## Gerçekten çalıştırılan canlı testler (10.10.2026)

| Test | Kaynak | Doğrudan kanıt | Sonuç |
|---|---|---|---|
| Cloudflare Git Builds üretim deploy | `aperion-bizimhesap-free` | e1785eef-6d5e-4557-b367-5595c577d756: GitHub commit b67cf887, Cloudflare Workers Builds SUCCESS | GEÇTİ |
| Worker sağlık | `/health` | HTTP 200, `ok:true`, `write_enabled:false`, `browser_binding:true` | GEÇTİ (yalnız servis/binding; gerçek BizimHesap login değil) |
| Yetkisiz tarayıcı erişimi | `/probe` | Yetkisiz istek HTTP 401 | GEÇTİ |
| Ürün okuma | Resmî B2B `GET /api/b2b/products` | HTTP 200; `resultCode:1`; `data.products`: 3.035 ürün; 1.334.980 bayt JSON yanıt | GEÇTİ: gerçek API veri yanıtı, zaman/satır mutabakatı ayrıca gerekli |
| Depolar | Resmî B2B `GET /api/b2b/warehouses` | HTTP 200; `resultCode:1`; `data.warehouses` içinde 2 nesne; `id` ve `title` alanları | GEÇTİ |
| Bir deponun stokları | Resmî B2B `GET /api/b2b/inventory/{depo-id}` | HTTP 200; `resultCode:1`; 733.501 bayt; `data.inventory` alanı | GEÇTİ |
| İki deponun tam mutabakatı | İkinci depo stokları ve depo bazlı stok farkları | İkinci depo ve ürün bazında karşılaştırma henüz çalıştırılmadı | KANIT YOK |
| Sunucu tarayıcısı / BizimHesap erişimi | Cloudflare Browser Run gerçek oturum | Gerçek sunucu tarayıcısı çalıştırıldı; masraf URL'sinden HTTP 200; `challenge_detected:false`; `login_detected:true`; `app_navigation_detected:false` | TARAYICI ÇALIŞTI; SUNUCUDA OTURUM YOK |
| Gider kaydetme | 500 TL Akaryakıt / 10.10.2026 / Ercan Nakit Kasa | Kullanıcı onayı saklı: `3a45b935-f6e7-40aa-aca2-cf648601e1fc`, durum `control_waiting`; gönderilmiş işlem yok | GEÇMEDİ: gerçek ERP kayıt kanıtı yok |
| Kaydı BizimHesap'tan tekrar okuma | Yeni giderin benzersiz kaynak ID'si + tutar/hesap karşılaştırması | Kayıt henüz yapılmadı | KANIT YOK |
| Mükerrer kayıt koruması | Aynı komutu iki kez gönderip kaynakta tek kayıt doğrulama | Gerçek ERP yazma için uygulanmadı | KANIT YOK |

## Modül kabul matrisi (ERP modu ≠ sadece API varlığı)

| Modül | Canlı okuma | Güvenli yazma | Kaynağa geri dönerek doğrulama | Karar |
|---|---|---|---|---|
| Ürün kartları | API kanıtlandı | Test edilmedi | Test edilmedi | KISMİ |
| Depolar | API kanıtlandı | Test edilmedi | Test edilmedi | KISMİ |
| Depo stokları | İlk depo API kanıtlandı | Test edilmedi | Test edilmedi | KISMİ |
| Müşteri / cari kartları | Yalnız tarihsel yerel kayıtlar | Test edilmedi | Test edilmedi | KANIT YOK |
| Tedarikçi / alış cari | Doğrudan test yok | Test edilmedi | Test edilmedi | KANIT YOK |
| Satış ve satış siparişleri | Yerel tarihsel veri, canlı değil | Test edilmedi | Test edilmedi | KANIT YOK |
| Alış ve alış siparişleri | Doğrudan test yok | Test edilmedi | Test edilmedi | KANIT YOK |
| Fatura / e-Arşiv / e-Fatura | Resmî fatura ekleme API'si belgeli; canlı okuma yok | Canlı kayıt testi yok | Test edilmedi | KANIT YOK |
| Teklifler | Doğrudan test yok | Test edilmedi | Test edilmedi | KANIT YOK |
| Masraflar | Ekran kullanıcı tarafından gösterildi; sunucuda okunmadı | 500 TL örneği ERP'ye yazılmadı | Test edilmedi | KANIT YOK |
| Kasa / banka / hesap hareketleri | Yalnız tarihsel yerel kayıtlar | Test edilmedi | Test edilmedi | KANIT YOK |
| Tahsilat / ödeme | Doğrudan test yok | Test edilmedi | Test edilmedi | KANIT YOK |
| Çalışanlar | Doğrudan test yok | Test edilmedi | Test edilmedi | KANIT YOK |
| Raporlar | Doğrudan test yok | Test edilmedi | Test edilmedi | KANIT YOK |

## Tarihsel veri ≠ canlı erişim

10.10.2026 Supabase sayımı:
- `sales_raw`: 48.924 satır; son DB içeri aktarma 04.09.2026 (UTC).
- `stock_raw`: 3.285 satır; son DB içeri aktarma 07.09.2026 (UTC).
- `bizimhesap_events`: 4.029 satır; son DB içeri aktarma 09.09.2026 (UTC).
- `bizimhesap_posting_queue`: 0; `bizimhesap_posting_log`: 0.
Bu satırlar kaynak ERP'nin son hareket zamanı veya anlık bütünlük göstergesi değildir.

## Kanıtlama kriterleri / go-no-go

1. **Oturum:** Cloudflare'ın sunucu tarayıcısı firmanın gerçek BizimHesap oturumunu yetkilendirilmiş şekilde açabilmeli. Telefon Safari'sindeki oturum kendiliğinden sunucuya aktarılmaz.
2. **Kaynak bütünlüğü:** Her modül için sabit `source_id`, güncelleme zamanı, satır adedi, sayfalama, alan tipleri ve farklar ölçülmeli. Veri yokluğu 0 diye gösterilmez.
3. **Hazırlama:** Gider/tahsilat/satış/kasa için gerçek hesap ve kategori ID eşleştirmesi yapılmalı; tarihler/vergiler belgelerle uyumlu olmalı.
4. **Onaylı finansal yazma:** Tekil onay ID'si, `idempotency_key`, 1 yazma denemesi, tarayıcı/API dönüşü, gerçek kaynak ERP kayıt ID'si zorunlu.
5. **Geri okuma:** Yazılan kaydı ERP'den yeniden oku; firma, modül, tutar, tarih, kategori ve kasa birebir eşleşsin; tekilleştirme testini geçsin.
6. **Sınır:** Resmî B2B API yalnızca fatura ekleme, ürünler, depolar, envanter işlemlerini belgeliyor (doküman indeksi: https://apidocs.bizimhesap.com/llms.txt). Her modülün bu API ile çalıştığı varsayılamaz. Daha geniş kapsam için yetkili oturum veya BizimHesap'ın ayrıca sağladığı desteklenen entegrasyon gerekir.
7. **Kabul kararı:** Bir modüle `CANLI` denmesi için güvenli uçtan uca testin **geçmesi** gerekir. Test edilmedi, eski kayıt var veya sadece 200 yanıt alındıysa `KANIT YOK/KISMİ` yazılır. Hiçbir fatura, kasa veya masraf kaydı başka modüle benzetecek şekilde yazılmaz.

## İlk işlem için bekleyen kullanıcı onayı

İşlem: 10.10.2026, Akaryakıt, 500 TL (KDV dahil alanı), ödenmiş, Ercan Nakit Kasa. Kullanıcının açık onayı vardır ancak **ERP yazması yapılmadı**. KDV belgeye göre teyit edilmeden ve kaynak hesap kesin eşleştirilmeden göndermeye izin verilmez. Önce mükerrer kaydı kontrol et ve gerçek kaynak kayıt ID'sini doğrula.

## Hâlen eksik olanlar

Canlı BizimHesap masraf/kasa oturumu, Cloudflare Browser Run'da kimlik doğrulanmış modül gezintisi, finansal yazmanın yetkili kaydı ve geri okuma. Bulut tarayıcısının masraf URL'sini açtığı kanıtlandı; uygulama giriş sayfasında kaldığı için iç modüle erişim kanıtı yok. Bu modüllerin tamamlandığı iddia edilemez.

Sonuç: **B2B canlı 3.035 ürün/2 depo/ilk depo stok okuması; Browser Run teknik çalıştırma kanıtlandı. Sunucu oturumu bulunamadı. Tam ön muhasebe otomasyonu ve tek tıklamasız sohbetten kayıt KANITLANMADI.**
