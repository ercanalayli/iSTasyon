# AperiON @ercanalayli_bot — Cloudflare-native Git bağlantısı (güvenli hazırlık)

**Durum:** Bu klasör GitHub kaynak kodudur; üretimdeki Cloudflare Worker'a bu PR ile yükleme veya değişiklik yapılmaz.

## Neden?

13.10.2026 salt-okunur GitHub Actions denetiminde mevcut `CLOUDFLARE_API_TOKEN` doğrulama `HTTP 401` ve canlı `aperion-command-bridge` kaynak/ayarları `HTTP 403` döndürdü. GitHub'dan Wrangler ile doğrudan yayınlama şu kimlikle mümkün değildir. İş kaydı: [AperiON #58](https://github.com/ercanalayli/iSTasyon/issues/58#issuecomment-6143660989).

Cloudflare'ın **Workers Builds → Git integration** işlevi, mevcut Worker'ı GitHub deposuna bağlayıp bulut tarafında kendisinin oluşturduğu ayrı build tokenıyla yeni sürüm yükleyebilir. Bu, GitHub eski API tokenına ihtiyaç duymaz.

## İlk bağlantı — yalnız hesap sahibi tarafından, bir kez

1. Cloudflare hesabında `Workers & Pages → aperion-command-bridge → Settings → Builds → Connect`.
2. GitHub'da `ercanalayli/iSTasyon` deposunu seç.
3. **Root directory:** `workers/ercanalayli-telegram-safe`.
4. **Deploy command (KRİTİK):** `npx --yes wrangler@4.125.0 versions upload --config wrangler.jsonc`.
5. **Production branch:** `main`; build command gerekmez.
6. Çıkan ayarlarda **Deploy command'un `wrangler deploy` OLMADIĞINI** doğrula. Cloudflare varsayılanı `wrangler deploy` olabilir; yanlış bırakılırsa eski Worker kodunu aniden değiştirebilir.
7. Git bağlantısı kurulduktan sonra önce yalnız yeni Worker sürümü oluşup oluşmadığını, mevcut aktif sürümün değişmediğini denetle.

### Korumalar ve devam kapıları

- `wrangler versions upload` **yeni kod sürümü oluşturur, üretim trafiğini ona geçirmez**. Ön izleme sürümü üretim bağlarını kullanabilir; ilk test **yalnız GET /healthz**, asla canlı Telegram mesajı taklidi veya finansal istek değil.
- `wrangler.jsonc` adı Cloudflare Worker `aperion-command-bridge` ile eşleşir. `APERION_DB` için tarihsel D1 `aperion-control-plane` bağı girilmiştir; **aktif Cloudflare Workers binding düzeyi 403 nedeniyle hâlâ teyit edilemedi**, dağıtımdan önce doğrulanmalıdır.
- Yeni kaynak `index.mjs` yalnız `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `APERION_TELEGRAM_OWNER_USER_ID`, isteğe bağlı `APERION_TELEGRAM_OWNER_CHAT_ID` sırlarını kullanır. Bunları kaynak, issue, workflow log veya ChatGPT sohbetine yapıştırmayın. **Mevcut prod Worker'daki karşılıkları ve bot kimliği henüz doğrulanmadı**.
- Mevcut Telegram `@ercanalayli_bot` üretim webhook'unu KESİNLİKLE yeniden ayarlama. `@hermes_6ji2dveoeupymddx_bot` ayrı bot; hiçbir token/webhook birleştirilmez.
- `GAMZE ONAY` adı finansal kayıt izni anlamına gelmez. Gamze için zaten kaynak GUID `FCB82CD3053A491986C6B2D1C9F5D329` mevcut. **Aynı siparişe yeni POST YASAK**. Mevcut kod yalnız doğrulama durumu verir; `addinvoice` ya da `cancelinvoice` çağırmaz.
- A1 canlı kaynağı `APERION_A1_VERIFIED_READ_URL` / `APERION_A1_READ_SECRET` ile ancak yetkilendirilmiş kaynak endpoint oluşturulduktan sonra açılabilir. O zamana kadar eski sabit 164.740,30 TL ve iptal edilmiş 9.000 TL lojistik masrafı güncel rapora konmaz.
- **Son gerçek yayın için ayrı geçiş planı gerekir:** üretim Worker'sının mevcut kod/binding yedeği, yeni sürümde `/healthz` ve özel kullanıcı testleri, geri alma hazırlığı, tek aktif Telegram webhook, açık ayrı işleme özgü finansal `ONAYLIYORUM`, API anahtarı rotasyonu, mükerrerlik ve sağlayıcı GUID readback.

Referanslar:
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/wrangler/commands/workers/#versions-upload
