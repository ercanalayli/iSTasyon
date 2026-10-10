# AperiON | BizimHesap: iPhone-first operasyon ve gerçek PwC denetim kabul kapısı

**Kullanıcı talimatı:** 10 Ekim 2026: “Telefondayım ve her şeyi telefondan yapacağız; gerekirse bu tarayıcı, gerekirse Server olacak.”

**İlk ilke:** ChatGPT iPhone sohbeti tek komut ve denetim ekranı. Kaynak veriler doğrudan mevcut BizimHesap B2B API'si veya kimliği doğrulanmış bulut tarayıcıdan; bulut işlem katmanı mevcut Cloudflare Worker + Supabase. Windows PC / CDP 9222-9223 / yerel PowerShell / AperiON listener **zorunlu bağımlılık değil**. iPhone kullanıcıdan şifre, API anahtarı veya cookie'yi sohbete göndermesini isteme. MFA varsa yalnız kullanıcı mobil güvenli oturumda tamamlar. Work Cloud Browser kredisini varsayılan kullanma.

## Canlı gözlem / gerçek sınırlar — 2026-10-10

| Parça | Gözlem | İspat sınırı |
|---|---|---|
| BizimHesap B2B `GET /customers` | HTTP 200, sekiz müşteri canlı kart ID'si tespit edildi | Fatura listesi değil |
| B2B `GET /products`, `/warehouses` | Daha önce doğrudan API ile doğrulanmış | Satış belgesi okuma yetkisini kanıtlamaz |
| B2B `POST /addinvoice` | 1 TL testte GUID döndü | Fatura toplamı satır düzeyinde bağımsız okunmadı; üretim fatura onayı yok |
| B2B `GET /invoices` | HTTP 404, bilinmeyen yol | “Fatura yok” çıkarımı YASAK |
| Cloudflare `aperion-bizimhesap-free.yenicespor-finans.workers.dev/health` | HTTP 200 `READ_ONLY_PREFLIGHT, write_enabled:false, browser_binding:true` | Sunucu + Browser binding var; BizimHesap login doğrulanmadı |
| Cloudflare `/setup` | Kimliksiz HTTP 401 | Erişim kontrolü etkin; süresi bitmiş eski handoff linki çalışmayacak |
| Windows listener `bot_commands #1819` | Read-only health isteği `pending` | Yerel Windows bağımlılığının mobil akışa blokaj olmaması gerekir |
| A1 snapshot | `A1-20261010-v3` | Stop 0060 Akın screenshot kanıtı; diğer 5 fatura **SOURCE UNKNOWN** |

## Tek doğru mobil çalışma akışı

1. **Komut iPhone'dan:** “A1 faturaları kontrol et”, “Gamze Eczanesi fatura taslağını hazırla”, “Akın fatura PDF'ini ve kalemlerini doğrula”.
2. **Source-first API:** Şirket/firma kimliği, cari GUID, ürün GUID, stok ve tarih doğrulanır. API fatura listesi sunmuyorsa **gerçek oturumlu bulut tarayıcı** kullanılır. Tahmini URL'yi GET/POST yoluna çevirme.
3. **Yetkili mobil login:** Mevcut Cloudflare tarayıcısı yalnız **tek kullanımlık, süreli, sunucu tarafından yetkilendirilmiş** telefon giriş bağlantısıyla açılır. Kullanıcı BizimHesap parolasını yalnız sağlayıcının gerçek giriş formuna yazar; MFA'sını kendisi tamamlar. Oturumun firma kimliği en az iki bağımsız alandan doğrulanır. Sadece domain/menü görmek authenticated proof değildir.
4. **Doğrudan belge kaynağı:** Satışlar ekranında tarih aralığı + müşteri kartı + belge no filtreleriyle fatura numarası, tarih, cari, TL, durum, SKU, miktar, birim bedel, indirim, KDV, matrah ve toplam çıkar. PDF/XML/e-belge kanıtı varsa tarih/sistem kaynağı/hash ile audit ledger'a bağlanır. Tek fatura için belgedeki kalemlerle sipariş detayları karşılaştırılır.
5. **Sipariş durumu:** Fatura ve satırları eşleşmişse invoice-stage **INVOICED/POSTED**; sevk irsaliyesi/tarih/teslimat belgesi yoksa shipment ve order **OPEN**. Kaynak yoksa `SOURCE_PENDING`, asla `NOT_INVOICED` diye negatif kesin hüküm değil. Mükerrer invoice POST mutlak yasak.
6. **Finansal eylem:** Alacak/ödeme/gider/fatura veya iptal gibi tüm gerçek yazmalarda işlem-özel `ONAYLIYORUM`; fiyat, stok, cari, tekrarlanan event key ve bütün kalemleri ön denetim; yazma sonrası kaynağı geri oku, fatura no+GUID+hash kaydet; göndermeyi/kapatmayı ayrı onayla.
7. **A1 ve PwC:** Altı stop + Kent + Gamze sekiz siparişin tamamı güncel kaynakla mutabık edilip audit trail raporu üretilmeden `PwC-ready`, `CLOSED` veya `VERIFIED_INVOICE_READBACK` deme. Gerçek PwC bağımsız finansal/iç denetimi kullanıcı bildirimi; bizim raporumuz PwC'nin görüşü/onayı değildir.

## Açık teknik işler — PENDING, henüz canlı kabul yok

**M1 — Mobile secure session:** Cloudflare free worker mevcut `/setup` için sabit kısa süreli handoff süresi var ve token kullanıcıdan sohbete istenmeyecek. Üretim için yeni, sunucu tarafından yetkilendirilmiş ve tek kullanım süreli handoff gerekir. Eski statik setup linki paylaşılmamalı; canlı oturum ve geri bağlantı olmadan hazır denmez.

**M2 — Browser invoice read-only:** Gerçek BizimHesap girişinden sonra Cloudflare tarafında doğrudan satış listesi, tarih/cari filtresi ve tek fatura detay okuma fonksiyonu ile kullanıcı kimliği doğrulanmış salt-okuma endpointi. Sunucu erişim denetimi, sınırlı kayıt/log ve finansal POST yok. Cloudflare Browser Rendering bağlantı süresi ve kullanım kotası gerçek kısıt; sınırsız kalıcı oturum vaat edilmez.

**M3 — Durable invoice evidence:** Kaynak belge numarası, satır bilgileri, kaynak tipleri, gözlem zamanı, önceki değer ve değişiklik nedeni, işlem benzersiz anahtarı; kanıtı olanla olmayanı ayrı göster. Giriş oturum cookie'sini Drive/Sheets/GitHub veya audit log'larına yazma. Bulut oturumunu saklamak gerekirse şifreleme+TTL+erişim denetimi+iptal yolu gerekir.

**M4 — Eight-order reconciliation:** `A1_FATURA_TAKIP` (https://docs.google.com/spreadsheets/d/155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc/edit#gid=1630062026) sekiz cari GUID içeriyor. Ekim 2026 kaynak satış faturalarını çapraz tara; Akın 07.10.2026 `M012026000000223` 6.731,75 TL screenshot ile var, ancak satır/PDF geri okuması yok. Diğer 5 ana A1 stop + Kent + Gamze doğrudan kaynak okuması bekliyor. Kullanıcıdan fatura ekran görüntüsü isteme, teknik erişim sorununu açık ve doğru statüyle bildir.

## Kabul doğrulaması

- iPhone dışında hiçbir bilgisayar/Windows/PowerShell gerekmedi.
- Canlı cloud `/health` HTTP200; `/setup` salt yetkili kullanıcı girişi; firma kimliği doğrulandı.
- BizimHesap'tan gerçekten en az bir kaynak fatura (numara, tarih, müşteri, tüm kalemler, toplam) okundu; aynı belge tekrar çalıştırıldığında mükerrer kayıt oluşmadı.
- 8 A1 siparişi müşteri GUID, sipariş kaynağı, fatura kaynağı, miktar, KDV, sevk durumu açısından tek tek raporlandı.
- Hiçbir finansal write, çift fatura, açık onaysız e-fatura gönderimi, doğrulanmamış sipariş kapanışı gerçekleşmedi.
- Başarısız her adım ayrı BLOCKED ve somut blocker olarak raporlandı.

**Etkin aşama:** SERVER_HEALTH_PASS / BROWSER_BINDING_PASS / AUTH_SESSION_BLOCKED / LIVE_INVOICE_READBACK_BLOCKED / FINANCIAL_WRITE_DISABLED.

**Sürüm mantığı:** Bu belge A1 14 kolonlu sabit tabloyu değiştirmez; sadece görevleri mobil server-first yürütür.

## 11.10.2026 teknik ilerleme — self-hosted VPS okuyucu prototipi (kurulum bekliyor)

**Bağlı VPS/SSH araç yetkisi bu ChatGPT oturumunda mevcut değil.** Bu yüzden canlı Hostinger'a dosya kopyalandı/servis başlatıldı denemez. Ayrı bir çalıştırılabilir paket üretildi: `aperion-bizimhesap-vps-reader-mvp.zip` (ChatGPT çalışma çıktısı). İçerik: Docker Compose, Dockerfile, `server.mjs`, `audit-core.mjs`, 6 adet otomatik test, paket bildirimi, güvenlik/kurulum dokümanı ve örnek env. Testler local Node 22 ile **6/6 PASS**, gerçek BizimHesap fatura okuma testi yapılmadı.

Mimari: Mevcut Hostinger VPS üzerinde açık kaynak Chromium Docker, kalıcı sunucu tarayıcı profili, yalnız localhost'a bağlanan 3001 GUI/4876 salt-okuma okuyucu; CDP 9222 hiçbir zaman internete açık olmayacak. Okuyucu sadece listede görünen satırları **CANDIDATES_ONLY** kaydeder; boş liste **fatura yok kanıtı değildir**. Fatura satır/PDF/XML bağımsız okuması henüz uygulanmadı; gerçek kullanımda `CLOSED` yok. Fatura oluşturma/gider/tahsilat vb. POST yok.

**Önemli ücretli plan düzeltmesi:** Tailscale'in Personal ücretsiz planı işletme kullanımı için uygun değildir (resmî https://tailscale.com/pricing). İlave abonelik gerektirmeyen tercih, VPS üzerinde **self-hosted WireGuard VPN** ve iPhone WireGuard istemcisidir. VPS kaynaklarının, WireGuard ve Chromium güvenliğinin ayrı denetimi gerekir. Port 3001/4876/9222'nin internete açılması yasak. LinuxServer Chromium GUI ayrıca terminal/yüksek yetkili erişim sunabildiğinden sadece güvenli özel ağdan ve denetimli kullanıcı erişimiyle açılır: https://docs.linuxserver.io/images/docker-chromium/.

**Sonraki teknik kabul zinciri:** VPS erişim yetkisi → çalışan Hermes/Docker envanteri → mevcut işlemi bozmadan kapsüllenmiş reader dağıtımı → WireGuard özel mobil giriş → kullanıcı MFA → canlı BizimHesap fatura ekranı ve bütün satır+PDF/XML → 8 sipariş mutabakatı ve duplicate gate → sağlık/recovery/backup/audit izi. Bu adımlar yerine gelmeden 7/24 çalışan diye sunulmaz.

