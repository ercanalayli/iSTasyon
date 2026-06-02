# Mail Ekstre Otomasyonu Test Kapısı v1

Bu dosya kapanmadan yeni banka, yeni modül veya yeni özellik eklenmeyecek.

## Kural

Bir iş bitmeden ve denenmeden başka işe geçilmeyecek.

## Test edilecek ana akış

1. AperiON, alaylimedikal@gmail.com mail kutusunu kontrol eder.
2. Banka ekstresi mailini bulur.
3. PDF / ek dosyayı alır.
4. Banka parser'ını çalıştırır.
5. Hareketleri pending_bank_movements tablosuna yazar.
6. Mükerrer kayıt oluşturmaz.
7. Ana ekranda sinyal gösterir.
8. Onay Merkezi'nde kayıtları listeler.
9. Kullanıcı tek tuşla onaylar.
10. Kayıt bizimhesap_queue tablosuna ready_for_bizimhesap olarak düşer.
11. Rapor üretilir.

## Test sırası

### Aşama 1 - Gmail bağlantısı

- [ ] alaylimedikal@gmail.com OAuth bağlantısı kuruldu
- [ ] Sistem bu mail kutusunda arama yapabiliyor
- [ ] has:attachment mailleri görebiliyor
- [ ] İş Bankası / Yapı Kredi arama sorguları çalışıyor

### Aşama 2 - Ekstre okuma

- [ ] PDF eki indirilebiliyor
- [ ] PDF metni çıkarılabiliyor
- [ ] Banka tipi algılanıyor
- [ ] Parser doğru seçiliyor

### Aşama 3 - Pending kayıt

- [ ] En az 1 hareket çıkarıldı
- [ ] amount_in doğru
- [ ] amount_out doğru
- [ ] tarih doğru
- [ ] açıklama doğru
- [ ] duplicate_key oluştu
- [ ] aynı mail ikinci kez geldiğinde mükerrer kayıt oluşmadı

### Aşama 4 - Onay Merkezi

- [ ] pending kayıtlar listelendi
- [ ] toplam giriş/çıkış doğru göründü
- [ ] Onayla butonu çalıştı
- [ ] Reddet butonu çalıştı
- [ ] onaylanan kayıt approved oldu

### Aşama 5 - BizimHesap kuyruğu

- [ ] onaylanan kayıt bizimhesap_queue tablosuna düştü
- [ ] amount_in için create_collection oluştu
- [ ] amount_out için create_payment oluştu
- [ ] status ready_for_bizimhesap oldu

## Bitme kriteri

Aşağıdaki cümle doğru değilse iş bitmiş sayılmaz:

"Mail geldi, AperiON otomatik aldı, analiz etti, pending'e attı, ben tek tuşla onayladım, kayıt BizimHesap kuyruğuna düştü."

## Yasak

Bu test kapısı kapanmadan:

- yeni banka parserına geçilmez
- dashboard süsleme yapılmaz
- Moka derinleştirilmez
- cari modülü büyütülmez
- başka iş açılmaz
