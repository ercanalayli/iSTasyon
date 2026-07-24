# AperiON Ticaret Çekirdeği v112

Amaç: ALAYLI ürünlerini BizimHesap'tan güvenli biçimde almak, internetteki doğrulanmış tekliflerle eşleştirmek, kârlı satış fiyatı önermek ve onaylı değişiklikleri satış kanalına/BizimHesap'a taşımak.

## Kaynak gerçekliği

- BizimHesap ürün/stok okuma botu mevcut; `product_raw` kaynağı olarak kullanılacak.
- Resmî B2B GET erişimi son denemede 401 verdi. API açılana kadar ekran botu yalnızca okuma için korunur.
- Fiyat önerisi onaysız yayımlanmaz. BizimHesap yazımı `commerce_sync_queue` onayından sonra yapılır.
- Rakip teklif; URL, satıcı, gözlem zamanı, stok bilgisi ve kanıt hash'i olmadan fiyat hesabına girmez.

## Uçtan uca akış

1. BizimHesap ürün/stok/maliyet çekimi.
2. Barkod öncelikli ürün kimliği ve tekilleştirme.
3. Rakip teklif toplama ve kanıt kaydı.
4. KDV, komisyon, teslimat ve minimum marjla fiyat önerisi.
5. Kullanıcı onayı.
6. Web kataloğunda yayımlama ve BizimHesap güncellemesini kuyruğa alma.
7. Sonuç geri okuma, mutabakat ve denetim izi.

## Yayın sırası

- Faz 1: Gerçek ürün kataloğu, fiyat kanıtı ve karar ekranı.
- Faz 2: ALAYLI Medikal web kataloğu; İnegöl içi aynı gün teslim ve WhatsApp sipariş.
- Faz 3: Online ödeme ancak mesafeli satış, KVKK, iade, teslimat ve ödeme sağlayıcısı tamamlandıktan sonra.

## Tamamlanması için kullanıcıdan gereken veri

- Satışa açılacak ilk ürün grubu ve gerçek ürün fotoğrafları.
- Minimum net kâr marjı, internet satış komisyonu ve teslimat maliyeti politikası.
- Alan adı tercihi ve sipariş WhatsApp numarası.
- BizimHesap B2B erişiminin açılması için yetkili API anahtarı veya sağlayıcı teyidi.
