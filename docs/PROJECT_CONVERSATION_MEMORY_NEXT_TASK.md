# AperiON — Project Conversation → Common Memory

## Amaç
ChatGPT içindeki AperiON/iSTasyON proje sohbetlerinde, Codex/Claude/Cursor içe aktarılmış oturumlarında ve repo içi görev/karar belgelerinde bulunan kalıcı bilgileri tek bir kanonik AperiON ortak hafızasına konsolide eden, kaynak/tarih/sürüm izli ve dedupe eden bir katman kur.

Kullanıcının bir bilgiyi hangi sohbette söylediğini tekrar hatırlatması gerekmemeli. Örnek: `Furkan Batkı -> ALAYLI çalışanı` bir kez doğrulandıysa ortak varlık hafızasında yaşamalı ve sonraki ajan/oturumlar bunu kullanabilmeli.

## Kanonik çalışma alanı
`C:\AperiON\iSTasyon`

Mevcut sistemi genişlet. Paralel ikinci bir hafıza sistemi kurma.

## Zorunlu veri modeli
En az şu kavramları destekle:
- `memory_sources`: kaynak tipi, proje/sohbet/oturum kimliği veya dosya yolu, kaynak tarihi, ingest tarihi, content hash, son senkron zamanı.
- `memory_facts`: subject/entity, predicate/relation, object/value, scope, valid_from, valid_to, confidence, status, source reference, first_seen, last_seen.
- `memory_decisions`: karar, kapsam, effective date, supersedes/superseded_by, source reference, status.
- `memory_conflicts`: aynı konu için çelişen aktif bilgiler, kaynakları, çözüm durumu.
- `memory_sync_state`: her kaynağın cursor/hash/checkpoint durumu.

Mevcut uygun tablolar varsa onları genişlet; gereksiz yeni tablo üretme.

## Davranış kuralları
1. Kaynak her zaman korunmalı: bilgi hangi sohbet/dosya/oturumdan, hangi tarihte geldi bilinmeli.
2. Aynı bilgi tekrar gelirse duplicate üretme; `last_seen`/kaynak ilişkisini güncelle.
3. Yeni bilgi eski bilgiyi açıkça değiştiriyorsa eski kaydı silme; supersede et ve tarihçeyi koru.
4. Çelişki varsa tahmin ederek birini seçme. `memory_conflicts` / `needs_review` oluştur.
5. Kullanıcının açık düzeltmesi daha eski türetilmiş/otomatik bilgiden önceliklidir.
6. Finansal write, BizimHesap write, ödeme/transfer/fatura/tahsilat oluşturma YASAK. Bu görev yalnız hafıza/okuma/senkronizasyon altyapısıdır.
7. Secret/token/parola içeriklerini hafızaya alma; yalnız secret’ın yapılandırılmış olup olmadığı gibi güvenli metadata tutulabilir.
8. Hassas kişisel bilgileri gereksiz yere kopyalama; yalnız AperiON operasyonu için gerekli kalıcı olguları tut.

## Kaynak adaptörleri
Mümkün olan kaynakları otomatik keşfet ve adaptörlü tasarla:
- repo içindeki `docs/CURRENT_STATUS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md` ve aktif görev/kanıt dosyaları,
- Codex uygulamasına içe aktarılmış Claude Code / Claude Cowork / Cursor oturum ve proje bağlamları (yerelde erişilebilen güvenli metadata/içerik üzerinden),
- ChatGPT AperiON proje sohbetleri için platformun yerelde/uygulamada sunduğu desteklenen erişim varsa kullan; desteklenen programatik erişim YOKSA bunu açıkça `BLOCKED_PLATFORM_ACCESS` olarak raporla ve PDF/manuel kopyala-yapıştırı ana mimari çözüm yapma.

ChatGPT sohbetlerine desteklenen erişim yoksa sistem yine çalışmalı: repo/Codex/import kaynaklarını ingest et ve ileride ChatGPT connector/export API geldiğinde yeni adapter eklenebilecek arayüz bırak.

## Ortak hafıza API/araçları
En az read-only sorgular sağla:
- entity/subject lookup,
- relation/fact lookup,
- karar geçmişi,
- conflict listesi,
- source provenance,
- son senkron durumu.

Ajanların kullanabileceği tek bir `memory context` çıktısı üret: verilen konu/entity için aktif gerçekler + geçerli kararlar + açık çelişkiler + kaynak/tarih.

## İlk gerçek konsolidasyon
Mevcut iSTasyon repo/dokümanlarından gerçek bir ilk ingest çalıştır. Test fixture ile yetinme.
- kaynak sayısı,
- çıkarılan fact/decision sayısı,
- dedupe sayısı,
- conflict sayısı,
- blocked kaynaklar
kanıta yazılsın.

## Testler
En az şu fixture senaryolarını doğrula:
1. aynı fact iki kaynaktan -> tek aktif fact + iki provenance,
2. kullanıcı düzeltmesi -> eski fact superseded,
3. çelişen iki kaynak -> needs_review/conflict,
4. tarihli karar değişimi -> geçmiş korunur,
5. secret benzeri içerik -> persist edilmez,
6. kaynak hash değişmemiş -> yeniden ingest duplicate üretmez,
7. entity lookup -> aktif factleri kaynak/tarihle döndürür,
8. ChatGPT programatik erişim yoksa graceful BLOCKED_PLATFORM_ACCESS.

## Kanıt
`state/project-conversation-memory-verification.json` üret. İçinde secret olmadan:
- checked_at,
- schema/version,
- source adapters,
- real ingest counts,
- fixture results,
- blocked platform access,
- duplicate/conflict counts,
- financial_writes: 0,
- secrets_exposed: 0.

## Dokümantasyon
`docs/CURRENT_STATUS.md` ve `docs/CHANGELOG.md` güncelle.

## Çalışma biçimi
Gerekli PowerShell/git/npm/test/deploy işlemlerini kendin yap. Kullanıcıdan komut kopyalamasını isteme. Mevcut kullanıcı değişikliklerini koru. Gerekirse Cloudflare/D1 tarafında yalnız hafıza şeması/read-only servis deploy edilebilir; gerçek finansal işlem endpointi çağırma.

## Bitiş raporu
1. Yapılanlar
2. Çalışanlar
3. Blokajlar — özellikle ChatGPT proje sohbetlerine desteklenen programatik erişim var/yok
4. İlk gerçek ingest sayıları
5. Kanıt dosyası
6. Commit SHA ve origin/main doğrulaması
7. Sıradaki otomatik adım
