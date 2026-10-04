# Apeiron | İstasyON — Google Apps Script + Sheets Web App

Bu paket eski ChatGPT Site günlük yüzeyini ücretsiz ve kalıcı Google Apps Script + Google Sheets mimarisine taşımak için hazırlanmıştır.

## Ana kaynaklar

- Apeiron Kontrol Merkezi: `155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc`
- Görev kaynağı: `IS_TAKIP_GIRIS`
- Ödeme ana kaynağı: `1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk`
- Uygulama yapılandırması: `WEB_APP_CONFIG`
- Menü/modül sözlüğü: `WEB_APP_MENU`
- Denetim: `EVENT_LEDGER`
- Belgeler: `BELGE_INDEKSI`
- Onaylar: `ONAY KUYRUGU`
- Finans: `FINANS_DASHBOARD`
- İstasyON: `ISTASYON_SNAPSHOT`

## Güvenlik

- Varsayılan salt-okuma.
- Ödeme/tahsilat gibi finansal sonuç doğuran işlemler bu panelden tamamlanamaz.
- Panel yalnız `todo/order/received` kategorilerinde operasyonel "tamamlandı" işlemi yapabilir.
- Her operasyonel tamamlama EVENT_LEDGER'a denetim izi yazar.
- KAYIT_ID idempotency anahtarıdır.

## Deploy

Apps Script projesine:
1. `Code.gs` içeriğini ekle.
2. `Index.html` HTML dosyasını ekle.
3. Manifest kullanılıyorsa `appsscript.json` ile değiştir.
4. Deploy > New deployment > Web app.
5. Execute as: Me.
6. Access: yalnız uygun Google hesabı/organizasyon; mali veriler nedeniyle herkese açık tavsiye edilmez.

Günlük kullanımda ChatGPT Work/Codex/TinyFish kredisi gerekmez.
