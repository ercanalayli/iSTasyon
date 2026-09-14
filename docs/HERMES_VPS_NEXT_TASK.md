# Hermes VPS - Siradaki Gorev

Tarih: 2026-09-14
Kanonik yerel klasor: `C:\AperiON\iSTasyon`

## Hedef
Hermes VPS + Windows worker + Telegram/command bridge hattini kaldigi yerden tamamla ve kanitla.

## Kullaniciya terminal isi verme
- Kullaniciya PowerShell/cmd/git/npm komutu kopyalatma.
- Gerekli tum yerel komutlari Codex kendisi calistirsin.
- Gerekirse yonetici terminalini kendisi acsin/kullansin.
- Sadece gercekten insan etkileşimi gereken CAPTCHA/MFA gibi durumda kullaniciyi cagir.

## Guvenlik siniri
- GERCEK FINANSAL KAYIT OLUSTURMA.
- BizimHesap write endpoint/komutlarini calistirma.
- Odeme, transfer, fatura, tahsilat, kasa hareketi veya benzeri kayit olusturma/degistirme yok.
- Salt-okuma, health, preflight, queue-inspection, connectivity ve dry-run testleri serbest.
- Secret/token/parola degerlerini loglama veya raporlama; yalnizca var/yok durumu ver.

## Yapilacaklar
1. `C:\AperiON\iSTasyon` repo durumunu kontrol et; remote/main ile uyumsuzluk varsa once guvenli sekilde senkronla. Kullanici degisikligi varsa ezme.
2. Repo icindeki mevcut Hermes baglantilarini, worker scriptlerini, device-command endpointlerini, Telegram preflight ve BizimHesap read-only queue yardimcilarini tespit et; yeni sistem uydurmadan mevcutlari kullan.
3. Hermes VPS icin canli health/erisilebilirlik kontrolu yap. Host/port/domain repo/env'den bulunabiliyorsa kullan; secret degerlerini aciklama.
4. Windows tarafinda Hermes/BizimHesap worker'in calisip calismadigini kontrol et; gerekiyorsa mevcut supervisor/task mekanizmasiyla yeniden baslat. Finansal write komutu gonderme.
5. Telegram preflight/webhook durumunu dogrula. Test gerekiyorsa yalnizca finansal olmayan test mesaji kullan.
6. BizimHesap icin yalnizca READ-ONLY baglanti testi yap: musteri/cari/stok/tedarikci ozet gibi mevcut read-only komutlardan birini kullan. Kayit olusturma yok.
7. Hermes'in kuyruktan read-only komutu alip sonuc dondurdugunu kanitla. Mukkerrer pending job olusturma.
8. Mevcut health/state/artifact yapisi varsa guncelle; yoksa minimum kanit dosyasi olustur:
   - `state/hermes-vps-health.json`
   - `state/windows-worker-health.json`
   - `state/hermes-readonly-verification.json`
   Dosyalar secret icermemeli.
9. Testleri calistir; basarisiz nokta varsa kok neden ve sonraki otomatik adimi yaz.
10. `docs/CURRENT_STATUS.md` ve `docs/CHANGELOG.md` dosyalarini sonucu yansitacak sekilde guncelle.

## Kabul kriterleri
- Hermes VPS: ONLINE veya net kok nedenle BLOCKED.
- Windows worker: ONLINE veya net kok nedenle BLOCKED.
- Telegram/command bridge: preflight OK veya net kok neden.
- En az bir BizimHesap READ-ONLY komutu uctan uca kuyruga alinip Hermes tarafindan alinmis ve sonucu dogrulanmis.
- Finansal write sayisi: 0.
- Secret ifsasi: 0.
- Kullaniciya terminal komutu: 0.

## Tur sonu raporu
Yalnizca sunlari raporla:
1. Yapilanlar
2. Calisanlar
3. Sorunlar / blokajlar
4. Kanit dosyalari
5. Commit SHA
6. Siradaki otomatik adim
