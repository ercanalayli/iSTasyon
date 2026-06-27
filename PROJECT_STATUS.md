# AperiON Project Status

Son guncelleme: 2026-06-27 Europe/Istanbul

## Calisma Protokolu

AperiON gelistirmesinde koordineli calisma protokolu gecerlidir.

- ChatGPT: urun yonu, mimari karar, oncelik, kalite kontrol, ekran/akis analizi.
- Codex: repo uygulama, dosya duzenleme, script calistirma, test sonucu, commit, durum dosyalari.
- Her turda sadece 1 ana hedef secilir.
- Tur sonunda `PROJECT_STATUS.md`, `NEXT_TASK.md`, `CHANGELOG_APERION.md` guncellenir.
- Onaysiz canli kayit, demo veriyi kesin veri gibi gosterme ve firma verilerini karistirma yasaktir.

## Mevcut Teknik Durum

Genel durum: Sistem calisan bir omurgaya sahip, ancak tum moduller gunluk guvenilir kullanim icin production-ready degil.

Koordineli calisma protokolu dosyalari `main` branch'e alinmistir. Bundan sonraki turlarda durum, karar, sonraki is ve kalite kontrol bu dosyalardan surdurulecektir.

2026-06-27 veri guveni turu sonucu: BizimHesap dry-run satis akisi artik satis tablosuna delete/insert yapmadan `[DRY-RUN] ... yazilmayacak` logu ile cikiyor. Son islemler botu dry-run modunda Supabase/state yazimini atliyor; Supabase hatasi olursa artik sadece loglanmayip hata olarak yukari tasiniyor.

Son denetimde calisan komutlar:

- `npm run preflight`: gecti.
- `npm run sync:bizimhesap:plan`: gecti.
- `npm run sync:bizimhesap:dry`: gecti, ancak dry-run davranisi tam guvenli degil.
- `npm run finance-smoke`: gecti.
- `npm run verify:main-finance-flow-v55`: gecti.
- `npm run bank:approval:preview`: gecti.
- `npm run verify:bizimhesap:queue`: gecti.

## Production'a En Yakin Parcalar

- BizimHesap kalici oturum ve ALAYLI MEDIKAL firma secimi.
- BizimHesap satis verisi cekme.
- Urun/stok ham veri cekme.
- Masraf ham veri cekme.
- Finans smoke test altyapisi.
- Ana finans akis matrisi.
- Banka onay preview ve BizimHesap queue dogrulama testi.

## Kismen Hazir Parcalar

- Finans Komuta Merkezi: ana urune gomulu, karar ekrani var; olgunluk orta.
- Gelir tablosu plan/tahakkuk/gerceklesen: veri modeli var, karar ekrani tam degil.
- Banka onay merkezi: analiz var, guven puani ve kuyruk var; tum canli kayit akisi kanitli degil.
- Cari kartlari: satis/tahakkuk analizi var; gercek tahsilat, acik bakiye ve odeme disiplini eksik.
- Urun kartlari: satis ve kar analizi var; tam stok hareketi, alis maliyeti ve dinamik urun karti olgun degil.
- Telegram/evrak: token ve bazi altyapi var; uctan uca akisin bittigi kanitlanmadi.

## Kritik Riskler

1. GitHub hourly BizimHesap workflow son kontrolde basarisiz gorundu.
2. Windows gorevleri kurulu olsa da bazi son sonuc kodlari temiz basari degil.
3. Banka hareketlerinde dusuk guvenli kayitlar var; otomatik kesin kayit riskli.
4. BizimHesap'a tek tik kayit akisi testten geciyor ama tum canli kayitlar icin tam kanit yok.
5. Cari ve urun kartlari muhasebe anlaminda tam kaynak bagli degil.
6. Veri guveni var ama tum veri kaynaklari bagli olmadigi icin tam degil.

## Olgunluk Tahmini

- Gunluk kullanilabilirlik: %62
- Teknik olgunluk: %58
- Finans Komuta Merkezi: %65
- Urun karti: %45
- Cari karti: %50

Bu yuzdeler kesin metrik degil; son denetimde calisan testler, eksik kaynaklar ve canli akis kanitlarina gore muhendislik tahminidir.

## Oncelik Sirasi

1. Veri guveni
2. Finans Komuta Merkezi
3. Banka onay kuyrugu
4. Firma izolasyonu
5. Gunluk kullanilabilir surum
