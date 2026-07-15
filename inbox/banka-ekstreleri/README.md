# Tarihsel Banka Ekstre Girisi

Ocak 2026'dan itibaren banka ekstrelerini bu klasore banka bazinda koyun.
Bu klasor Git'e alinmaz; ham ekstreler sadece yerel bilgisayarda kalir.

Onerilen adlandirma:

`2026-01_VakifBank.xlsx`
`2026-01_IsBankasi.pdf`
`2026-01_YapiKredi.xlsx`
`2026-01_Akbank.pdf`
`2026-01_Garanti.xlsx`

Calisma ilkesi:

1. AperiON once islem numarasi, tarih, tutar ve kaynak hesapla satiri okur.
2. Ayni duplicate key ile AperiON kuyrugunda veya BizimHesap sonucunda kanit
   varsa satir tekrar kayda gitmez.
3. Kaynak ve hedefi kesin POS, virman veya banka masrafi satirlari isleme
   adayi olur.
4. Cari belirsiz gelen para, kaynak banka hesabinda `Hesaba Para Girisi`
   olarak tutulur; tahmini bir cari bakiyesine yazilmaz.
5. Format taninmayan veya kaniti eksik dosya once `inceleme` raporuna gider.

Bu klasore dosya geldikten sonra ilk adim salt-okunur taramadir:

`npm run bank:history:reconcile:dry`

Bu komut BizimHesap'a veya Supabase'e kayit yazmaz.
