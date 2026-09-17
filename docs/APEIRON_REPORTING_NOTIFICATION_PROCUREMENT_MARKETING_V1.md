# ApeirON: raporlama, bildirim, satın alma ve pazarlama v1

Karar (17.09.2026): BizimHesap kayıt girişini kullanıcı yapar. ApeirON/Codex BizimHesap'ta kayıt oluşturmaz, değiştirmez, silmez, kaydetmez veya işlem belgesi eklemez. Salt-okunur kontrol ve kaynaklı raporlama devam eder. Eski işlem onayları bu kararı kaldırmaz.

## Mevcut çalışan parçalar

- Memory OS/D1 Event Ledger: olay, kanıt, kalıcı kural ve provenance.
- Today/Attention Engine: vadeler, açık işler, bekleyen onaylar, bozuk kaynaklar ve öncelikler.
- Gmail/Drive watcher: değişiklik imleci ve içerik sürümü; aynı belgeyi tekrar çıkarmaz.
- Telegram iş bildirimleri ve günlük rapor kanalı.
- BizimHesap'tan salt-okunur satış, müşteri, ürün ve oturum kontrolü.
- Yeni `/api/aperion-operations`: kimlik doğrulamalı, salt-okunur birleşik görünüm. Sağlık kontrolü `?health=1` veri açmaz.

Bunların varlığı satın alma veya pazarlamanın uçtan uca canlı olduğu anlamına gelmez. Eksik kaynaklar sıfır sayılmaz.

## Ürün akışı

1. Kaynak olayı (Gmail, Drive, BizimHesap salt-okuma, kullanıcı notu) → kimlik/sürüm/mükerrer kontrolü.
2. Event Ledger → doğrulanmış olgu, açık iş veya yalnız inceleme adayı.
3. Today Engine → önem, vade, risk, doğruluk ve kaynak sağlığına göre sıra.
4. Rapor → kaynak tarihi, güven, kapsam, provenance ve sonraki eylem.
5. Bildirim adayı → tekil olay anahtarı, öncelik ve sessizleştirme; teslim edilmeyene “gönderildi” denmez.
6. Kullanıcı eylemi → satın alma veya pazarlama dış etkisi varsa ayrıca işlem-anı onayı. BizimHesap kayıt adımı kullanıcıdadır.
7. Sonuç → birincil kaynaktan geri okuma, Memory OS ve bağımsız retrieval.

## Modüller ve kabul kapıları

| Modül | İlk görünüm | Canlı sayılma şartı |
| --- | --- | --- |
| Raporlama | Günlük öncelikler, kaynak sağlığı, açık satın alma taahhütleri | Her sayı için kaynak/tarih; eksik kaynak açıkça görünür |
| Bildirim | Önce yalnız aday listesi | Tekil anahtar, teslim kanıtı, tekrar bastırma, önem/sessiz saat politikası |
| Satın alma | Açık sipariş/tedarikçi taahhüdü, bebek bezi siparişleri | Tedarikçi ve fiyat sürümü doğrulanır; sipariş gönderimi ayrı onaylıdır |
| Pazarlama | Mevcut iş kalemleri; CRM yoksa “doğrulanmış kaynak yok” | İzinli müşteri listesi, segment, kampanya taslağı, gönderim onayı, yanıt/sonuç ölçümü |
| BizimHesap | Salt-okunur doğrulama | Yazma kilidi her otomatik işçide ve bulut zamanlayıcısında etkili |

## İlk işletim sırası

- Önce veri sözleşmesi: kaynak, entity, zaman, doğruluk, sürüm ve provenance.
- Sonra tek günlük yönetim raporu ve yalnız aksiyon gerektiren bildirimler.
- Satın almada açık sipariş, stok, fiyat/vade ve tedarikçi riski; gerçek sipariş gönderilmez.
- Pazarlamada müşteri/fırsat görünümü, kampanya taslağı, onay ve sonrasında ölçüm.
- Her yeni modül için gerçek kaynak geri okuması ve sessiz/no-change kabulü olmadan “canlı” etiketi yok.

## Şu anki sınır

`/api/aperion-operations` veri okur, bildirim adayı üretir ve hiçbir mesaj/kampanya/satın alma işlemi göndermez. Pazarlama CRM kaynağı doğrulanmadığı sürece kapsam eksik gösterilir. Otomatik bildirim teslimi, satın alma ve pazarlama yürütmesi sonraki kabul aşamalarıdır.

Canlı kabul (17.09.2026): Pages dağıtımı ve korumasız sağlık uç noktası PASS. GitHub Actions'taki yetkili anahtarla hem bu raporun veri ucu hem mevcut session-bootstrap HTTP 401 döndü; yani yetkili veri geri okuması FAIL. Bu anahtar uyuşmazlığı diğer çalışan erişim yollarını bozmadan ayrı giderilmeli; o zamana kadar canlı veri kapsamı PASS sayılmaz. Kanıt: GitHub Actions 35260574061, 35261199610 ve Memory OS olayı `codex:aperion:operations-protected-read-auth:20260917`.
