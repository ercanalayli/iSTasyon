# AperiON Ana Menü Kâr Zekası Bağlantı Patch v39

## Amaç
Ana `index.html` dosyasındaki aktif `nav.innerHTML` menüsüne, mevcut menüleri silmeden `Kâr Zekası` bağlantısı eklemek.

## Güvenlik
- Ana sistem fonksiyonları değişmeyecek.
- `gP()` fonksiyonu değişmeyecek.
- Mevcut `Finans Merkezi`, `Gider Analizi`, `Banka İşlem` menüleri korunacak.
- Yeni bağlantı ayrı sayfa açacak: `finans.html`.
- Hatalı iframe veya gömülü kod kullanılmayacak.

## Eklenecek satır
Bu satır `Para` bölümünde, `Finans Merkezi` satırından sonra eklenmeli:

```html
<div class="sb-item" onclick="window.open('finans.html','_blank')"><span class="sb-ico">KZ</span><span><span class="sb-lbl">Kâr Zekası</span><span class="sb-sub">SMM, stok, gider, net kâr</span></span></div>
```

## Hedef blok
`index.html` içinde şu satırdan sonra:

```html
<div class="sb-item" onclick="gP('finans',this)"><span class="sb-ico">FN</span><span><span class="sb-lbl">Finans Merkezi</span><span class="sb-sub">gelir, gider, net sonuc</span></span></div>
```

## Test
1. Ana sayfa açılmalı.
2. Sol menüde Kâr Zekası görünmeli.
3. Tıklanınca `/finans.html` yeni sekmede açılmalı.
4. `finans.html` v39 paneline yönlendirmeli.
5. Mevcut Finans Merkezi/Gider Analizi/Banka İşlem menüleri çalışmalı.

## Rollback
Eklenen tek satır silinirse eski menü yapısına dönülür.
