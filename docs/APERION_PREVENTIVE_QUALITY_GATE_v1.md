# AperiON Preventive Quality Gate v1

Tedavi edici degil, onleyici calisma kurali.

Bu dosya, AperiON icin her guncellemeden once ve sonra uygulanacak zorunlu kontrol kapisidir.

## Ana kural

Kullanici hata yakalamak zorunda kalmayacak.

Asistan veya gelistirme ajani, teslim etmeden once ekrani ve is akisini kontrol edecek.

## Teslimden once zorunlu kontroller

1. Istenen is dogru ekranda mi?
2. Gereksiz ayri ekran acildi mi?
3. Eski ekran hala gorunuyor mu?
4. Eski buton / eski metin / test ibaresi kaldi mi?
5. Yeni ozellik ana ekranda sinyal veriyor mu?
6. Mobilde ilk bakista anlasiliyor mu?
7. Butonlar tiklanabilir mi?
8. Her buton gercek davranis yapiyor mu?
9. Duzelt ve Onayla calisiyor mu?
10. Onayla ledger simülasyonuna geciriyor mu?
11. Reddet kaydi kaldiriyor mu?
12. Beklet kaydi inceleme durumuna aliyor mu?
13. Mailden yukle gibi son kullaniciya gereksiz buton kaldi mi?
14. Mükerrer kontrol anahtari var mi?
15. Gider yeri var mi?
16. Cari / karşı taraf var mi?
17. Hareket tipi var mi?
18. Guven puani var mi?
19. Oneri sebebi var mi?
20. Emin olunmayan kayit needs_review kaliyor mu?
21. Canli kayit onaysiz olusuyor mu?
22. Sabit link eski ekrana mi gidiyor?
23. Commit olustu mu?
24. Repo dosyasi gercekten guncellendi mi?
25. Kullaniciya link vermeden once dosya icerigi tekrar okundu mu?

## Teslim mesaji kurali

Kullaniciya "oldu" denmeden once su bilgiler verilecek:

- Yapilan is
- Degisen dosya
- Commit SHA
- Kontrol edilenler
- Kalan risk varsa acikca risk
- Sabit link

## Yasak davranislar

- Eski ekrani duzeltmeden yeni final dosya vermek
- Buton calismadan teslim etmek
- Mobil gorunumu kontrol etmeden tamam demek
- Kullaniciya hata yakalatmak
- Test butonunu gercek is gibi birakmak
- "Haklisin" deyip ayni hatayi tekrarlamak

## AperiON felsefesi

AperiON kullaniciyi yormaz.

AperiON once sinyal verir.

AperiON onerir.

AperiON emin degilse bekletir.

Kullanici sadece son karari verir.
