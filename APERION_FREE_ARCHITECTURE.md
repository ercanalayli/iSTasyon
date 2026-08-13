# AperiON ücretsiz işletim mimarisi

## Ana katmanlar

- Cloudflare Pages: kullanıcı arayüzü ve Pages Functions.
- Cloudflare D1 (`APERION_DB`): küçük operasyon kayıtları, sağlık, onay, karar ve audit kuyrukları.
- Google Drive: ham evrak, günlük dışa aktarımlar, CSV/JSON arşivi ve provider bağımsız yedek.
- Google Sheets: insan tarafından düzenlenen kurallar, eşleştirmeler, görev ve onay görünümü. Ham satış veritabanı değildir.
- GitHub: kod, şema, hassas olmayan üretilmiş dashboard özetleri ve sürüm geçmişi.
- Yerel botlar: BizimHesap ve diğer kaynaklardan veri çeker; D1/Drive/Sheets hedeflerine idempotent olarak aktarır.

## Güvenlik ve doğruluk

- Eksik veri sıfır sayılmaz.
- Her dış yazma `idempotency_key` taşır.
- Finansal kayıtlar kullanıcı onayı olmadan BizimHesap'a gönderilmez.
- Drive ve Sheets bağlantı bilgileri istemci tarafına veya statik Pages dosyalarına konmaz.
- Hassas ham veriler GitHub'a veya herkese açık Pages varlıklarına yazılmaz.

## Kurulum

1. `wrangler login`
2. `wrangler d1 create aperion-control-plane`
3. Dönen database id değerini `wrangler.jsonc` içine yaz.
4. `wrangler d1 migrations apply aperion-control-plane --remote`
5. Cloudflare Pages projesine `APERION_DB` D1 binding ekle.
6. Yeni dağıtımı yap ve `/api/telegram-preflight` sonucunu doğrula.

## Kurtarma

- D1 günlük dışa aktarımı Drive'a tarih damgalı SQL/JSON olarak yazılır.
- Kontrol Sheet'i kaybolursa D1 ve Drive arşivinden yeniden üretilir.
- D1 erişilemezse dashboard engelli kaynağı açıkça gösterir; finansal otomasyon durur.
