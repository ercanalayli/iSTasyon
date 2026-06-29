# AperiON Project Status

Son guncelleme: 2026-06-29 Europe/Istanbul

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

2026-06-27 banka onay zinciri turu sonucu: Banka Canli ekrani artik iki onay hattini birlikte okur: mail ekstre icin `pending_bank_movements -> bizimhesap_queue`, Telegram/gorsel eski hat icin `bank_transactions -> bizimhesap_posting_queue`. Her kayitta kuyruk id, worker sonucu ve BizimHesap kayit var/yok bilgisi ekranda gosterilir.

2026-06-27 firma izolasyonu turu sonucu: ALAYLI karar ekranlarinda kritik queue ve log sorgulari firma filtresiyle kilitlendi. `verify:firm-isolation` komutu eklendi ve ALAYLI disi verinin ana karar ekranlarina karismamasi icin statik kontrol baslatildi.

2026-06-27 gunluk kullanilabilir surum turu sonucu: Ana veri denetimi kartina `Gunluk Kullanim Durumu` paneli eklendi. Panel, ana modulleri gunluk kullanilabilir / kismen hazir / blokajli olarak ayirir ve ilk 5 blokaji ekranda gosterir. `verify:daily-readiness` komutu eklendi.

2026-06-27 banka onay aksiyonu turu sonucu: Banka Canli / Onay Akisi satirlarinda BizimHesap hedefi, hesap, cari, kayit turu, kuyruk/worker kaniti ve hazir degil sebebi gorunur hale getirildi. Hazir olmayan, dusuk guvenli, mukerrer adayli veya zaten kuyrukta/islenmis kayitlarda `BizimHesap'a Kaydet` butonu pasif hale gelir. `verify:bank-approval-action` komutu eklendi.

2026-06-29 canli yayin turu sonucu: GitHub push kilidi hesap secimiyle cozuldu. `GCM_ACCOUNT=ercanalayli` ile iki yerel commit `main` branch'e pushlandi. GitHub raw ve GitHub Pages URL'sinde `Gunluk Kullanim Durumu`, `bankActionState` ve `bank-posting-proof` metinleri dogrulandi. Canli commit: `5370338`.

2026-06-29 banka -> BizimHesap kanit turu sonucu: `bank:approval:preview` 25 onay bekleyen banka hareketi buldu; 19'u yuksek guvenli, 6'si inceleme istiyor. `bizimhesap:queue:dry` calisti ve `bizimhesap_queue` icinde 0 hazir kayit oldugunu dogruladi. Yani worker hatti bagli, fakat islenecek kayit yok; canli islem icin once kullanici onayli bir banka hareketi kuyruga alinmali.

2026-06-29 banka onay adayi turu sonucu: `bank:approval:candidates` komutu eklendi ve calisti. Komut once banka onay preview uretir, sonra dusuk riskli ilk onay adayini secer. Ilk onerilen aday: VakifBank 2026-06-10, -8,37 TL, Banka/POS masrafi, guven %90, pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7`. Canli onay/RPC calistirilmadi.

2026-06-29 guvenlik kilitli kuyruga alma turu sonucu: `tools/approve_bank_candidate_v70.cjs` eklendi. Komut `--id` ve `--confirm ONAYLIYORUM` olmadan `approve_pending_bank_movement` RPC'sine gitmez. `bank:approval:candidate:dry` calisti, ayni VakifBank adayini dogruladi ve RPC calistirmadan `data/banka_onay_kuyruk_kaniti.json` dry-check raporu uretti.

2026-06-29 banka aday kanit okuma turu sonucu: `bank:approval:candidate:proof` komutu eklendi ve calisti. Secilen VakifBank -8,37 TL adayinin `pending_bank_movements.status=pending` oldugu, `bizimhesap_queue` icinde henuz kayit olmadigi dogrulandi. Komut salt-okunur calisir; canli onay/RPC calistirmadi.

Son denetimde calisan komutlar:

- `npm run preflight`: gecti.
- `npm run sync:bizimhesap:plan`: gecti.
- `npm run sync:bizimhesap:dry`: gecti, ancak dry-run davranisi tam guvenli degil.
- `npm run finance-smoke`: gecti.
- `npm run verify:main-finance-flow-v55`: gecti.
- `npm run bank:approval:preview`: gecti.
- `npm run verify:bizimhesap:queue`: gecti.
- `npm run verify:daily-readiness`: gecti.
- `npm run verify:firm-isolation`: gecti.
- `npm run verify:bank-approval-action`: gecti.
- GitHub raw `index.html`: yeni kod var.
- GitHub Pages `?v=5370338`: yeni kod var.
- `npm run bizimhesap:queue:dry`: gecti, hazir kuyruk 0.
- `npm run bank:approval:candidates`: gecti, ilk aday secildi.
- `npm run verify:bank-candidate-guard`: gecti.
- `npm run bank:approval:candidate:dry`: gecti, RPC calistirilmadi.
- `npm run bank:approval:candidate:proof`: gecti, pending durum ve queue yok kanitlandi.

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
- Banka onay merkezi: analiz, guven puani, hedef hesap/cari/kayit turu ve kuyruk/worker kaniti gorunur. Dusuk guven/mukerrer/cari belirsiz kayitlar kilitlenir.
- Cari kartlari: satis/tahakkuk analizi var; gercek tahsilat, acik bakiye ve odeme disiplini eksik.
- Urun kartlari: satis ve kar analizi var; tam stok hareketi, alis maliyeti ve dinamik urun karti olgun degil.
- Telegram/evrak: token ve bazi altyapi var; uctan uca akisin bittigi kanitlanmadi.

## Kritik Riskler

1. GitHub hourly BizimHesap workflow son kontrolde basarisiz gorundu.
2. Windows gorevleri kurulu olsa da bazi son sonuc kodlari temiz basari degil.
3. Banka hareketlerinde dusuk guvenli kayitlar var; otomatik kesin kayit riskli.
4. BizimHesap'a tek tik kayit akisi testten geciyor; ancak yeni canli kayit testi kullanici onayi olmadan yapilmadi.
5. Cari ve urun kartlari muhasebe anlaminda tam kaynak bagli degil.
6. Veri guveni var ama tum veri kaynaklari bagli olmadigi icin tam degil.

## Olgunluk Tahmini

- Gunluk kullanilabilirlik: %70
- Teknik olgunluk: %63
- Finans Komuta Merkezi: %69
- Urun karti: %45
- Cari karti: %50

Bu yuzdeler kesin metrik degil; son denetimde calisan testler, eksik kaynaklar ve canli akis kanitlarina gore muhendislik tahminidir.

## Oncelik Sirasi

1. Veri guveni
2. Finans Komuta Merkezi
3. Banka onay kuyrugu
4. Firma izolasyonu
5. Gunluk kullanilabilir surum
