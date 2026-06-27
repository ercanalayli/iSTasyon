# AperiON QA Checklist

Son guncelleme: 2026-06-27 Europe/Istanbul

## Her Tur Zorunlu Kontrol

- [ ] Tek ana hedef belirlendi.
- [ ] Canli kayit gerekiyorsa kullanici onayi alindi.
- [ ] Demo/uydurma veri canli karar ekrani gibi sunulmadi.
- [ ] Firma izolasyonu kontrol edildi.
- [ ] Degisiklikten once ilgili dosyalar okundu.
- [ ] Test komutlari calistirildi veya neden calistirilamadigi yazildi.
- [ ] `PROJECT_STATUS.md` guncellendi.
- [ ] `NEXT_TASK.md` guncellendi.
- [ ] `CHANGELOG_APERION.md` guncellendi.
- [ ] Tur sonunda Yapilanlar / Kalanlar / Kontrol Ettiklerim / Commit / Guncellenen dosyalar raporlandi.

## Veri Guveni Kontrolleri

- [ ] Dry-run canli tabloya yazmiyor.
- [ ] Commit modu acikca ayriliyor.
- [ ] Hata alan komut basarili gibi raporlanmiyor.
- [ ] `aperion_last_sync.json` gercek sonucu yaziyor.
- [ ] Mukkerrer kayit kontrolu var.
- [ ] Kaynak, firma, tarih ve kayit ID izlenebilir.
- [ ] Duzeltme ve ret islemleri loglaniyor.

## BizimHesap Kontrolleri

- [ ] Login calisiyor.
- [ ] ALAYLI MEDIKAL firma secimi dogru.
- [ ] Satis cekimi calisiyor.
- [ ] Urun/stok cekimi calisiyor.
- [ ] Masraf cekimi calisiyor.
- [ ] Fatura detay okuma hatalari gorunur.
- [ ] Onaylanan banka hareketi BizimHesap kuyruğuna giriyor.
- [ ] Worker islenen kaydi processed/failed olarak isaretliyor.

## Finans Komuta Merkezi Kontrolleri

- [ ] Planlanan, tahakkuk ve gerceklesen ayrimi gorunuyor.
- [ ] Banka onay bekleyen sayisi gercek kaynaktan geliyor.
- [ ] Gelir tablosu tutarlari kaynak belirtmeden kesin veri gibi sunulmuyor.
- [ ] Banka bakiyeleri son ekstreye gore tarih ve kaynakla gorunuyor.
- [ ] Kullanici onayi olmadan kesin kayit yapilmiyor.

## Urun ve Cari Kontrolleri

- [ ] Urun karti satis, adet, ciro ve maliyet kaynagini gosteriyor.
- [ ] Kategori katsayisi ile hesaplanan maliyet kaynak notu tasiyor.
- [ ] Cari karti satis/tahakkuk ile tahsilat/acik bakiye ayrimini karistirmiyor.
- [ ] Eksik tahsilat veya bakiye kaynagi acikca isaretleniyor.

