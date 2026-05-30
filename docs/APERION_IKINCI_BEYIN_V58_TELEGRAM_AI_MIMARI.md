# AperiON İkinci Beyin v58 — Telegram ve Program İçi Yapay Zekâ Mimarisi

Bu doküman, AperiON İkinci Beyin modülünün kullanıcıyla nasıl konuşacağını, Telegram üzerinden nasıl yönetileceğini ve program içinde nasıl bir bot/yapay zekâ katmanı kurulacağını tanımlar.

## Ana karar

AperiON İkinci Beyin’in ana iletişim kanalı Telegram olacak.

Program içi arayüz ise ikinci kanal olacak:

```text
Telegram
→ hızlı iletişim, hatırlatma, onay, kayıt ekleme

AperiON web paneli
→ detaylı liste, rapor, düzenleme, belge görüntüleme
```

## Telegram bitti mi?

Hayır. Telegram altyapısı mevcut projede var ve bazı bot/komut dosyaları bulunuyor; ancak İkinci Beyin için özel Telegram konuşma akışı henüz tamamlanmadı.

Tamamlanması gereken yeni Telegram katmanı:

```text
İkinci Beyin Telegram Botu v58
```

## Telegram iletişim prensibi

Telegram botu sadece komut bekleyen kaba bir bot olmayacak. Kullanıcıyla konuşur gibi ilerleyecek.

Örnek:

```text
Kullanıcı:
Peugeot trafik sigortası 12 Haziran’da bitiyor, hatırlat.

Bot:
Kaydı şöyle açıyorum:
Araç: Peugeot 3008
Tür: Trafik sigortası
Son tarih: 12 Haziran
Hatırlatma: 30 gün / 7 gün / 1 gün önce
Onaylıyor musun?
```

Kullanıcı onay verirse kayıt oluşur.

## Temel Telegram komutları

```text
/bugun
/yarin
/hafta
/ay
/gecikenler
/odemeler
/yapilacaklar
/belgeler
/arac
/ev
/saglik
/resmi
/ekle
/hizli_ekle
/ara
/rapor
```

## Akıllı kısa komutlar

Kullanıcı her zaman slash komutu yazmak zorunda kalmamalı.

Doğal dil desteklenecek:

```text
Bugün ne var?
Bu hafta ne ödeyeceğim?
Arabamla ilgili yaklaşan işler ne?
Ev aidatını ödedim.
Su faturası geldi 480 TL, son gün 15 Haziran.
MTV’yi ikinci taksit olarak kaydet.
Bu belgeyi trafik sigortasına bağla.
```

## Telegram üzerinden kayıt ekleme

Bot şu girdilerden kayıt açabilmeli:

1. Normal metin
2. Fotoğraf
3. PDF / belge
4. Dekont
5. Fatura ekran görüntüsü
6. Poliçe dosyası
7. Sesli mesaj transkripsiyonu ileride eklenebilir

## Kayıt ekleme akışı

```text
Kullanıcı mesaj atar
→ Bot niyeti anlar
→ Kayıt taslağı çıkarır
→ Eksik alanları sorar
→ Kullanıcı onaylar
→ Supabase kaydı oluşur
→ Belge varsa Drive bağlantısı eklenir
→ Hatırlatma planlanır
```

## Onay merkezi mantığı

Telegram’da her kritik işlem onay ister.

Örnek:

```text
Bu kaydı oluşturayım mı?
[Onayla] [Düzenle] [İptal]
```

Ödeme yapıldı işaretleme:

```text
Ev aidatı ödendi olarak işaretlensin mi?
[Ödendi] [Dekont Ekle] [Vazgeç]
```

## Günlük özet

Her sabah Telegram’dan kısa özet:

```text
Günaydın Foto.
Bugün 3 işlem var:
1. Su faturası — 480 TL — son gün bugün
2. Batıkent aidat — bekliyor
3. Peugeot trafik sigortası — 12 gün kaldı

Geciken: 1
Bu hafta toplam bekleyen ödeme: 4.250 TL
```

## Akşam kontrolü

Akşam kısa kontrol:

```text
Bugün kapatılmayan 2 kayıt var:
1. Su faturası
2. Aidat

Ödendi mi?
```

## Program içi yapay zekâ / bot mümkün mü?

Evet, mümkün.

AperiON içinde iki seviyeli bot kurulacak:

### 1. Kural tabanlı bot

İlk sürümde güvenli ve ücretsiz/ucuz ilerlemek için kural tabanlı bot kullanılır.

Yapabilecekleri:

- Yaklaşan ödemeleri listeler
- Gecikenleri bulur
- Eksik belgeyi gösterir
- Son tarih yaklaşınca uyarır
- Kategoriye göre filtreler
- Durum değiştirir

### 2. Yapay zekâ destekli asistan

İkinci aşamada doğal dil anlayan asistan eklenir.

Yapabilecekleri:

- Kullanıcının mesajından kayıt taslağı çıkarır
- Belge/fatura açıklamasını yorumlar
- Özet üretir
- Öncelik önerir
- Risk analizi yapar
- “Bu ay beni ne bekliyor?” sorusuna cevap verir

## Program içindeki bot ekranı

AperiON web panelinde bir sağ yan panel olabilir:

```text
AperiON Asistan
```

Kullanıcı şunu yazabilir:

```text
Bu ay ödenecekleri göster.
Peugeot ile ilgili her şeyi getir.
Ev aidatlarını listele.
Belgesi eksik olanları göster.
Bu hafta kritik ne var?
```

Bot paneli cevap verir ve ilgili kayıtları açar.

## Bot güvenlik sınırları

Bot asla şu işleri otomatik yapmayacak:

- Bankadan ödeme gönderme
- Kayıt silme
- Kritik tutar değiştirme
- Onaysız ödeme oldu işaretleme
- Onaysız resmi belgeyi arşivleme

Yapabilecekleri:

- Hatırlatır
- Taslak oluşturur
- Önerir
- Onay ister
- Kayıt açar
- Durum günceller
- Raporlar

## Telegram veri modeli

Her Telegram mesajı loglanacak:

| Alan | Açıklama |
|---|---|
| message_id | Telegram mesaj id |
| user_id | Telegram kullanıcı id |
| chat_id | Sohbet id |
| raw_text | Gelen mesaj |
| intent | ödeme ekle / sorgu / durum güncelle / belge ekle |
| parsed_payload | Çıkarılan yapılandırılmış veri |
| confidence | Güven seviyesi |
| status | taslak / onay bekliyor / işlendi / hata |
| related_record_id | Bağlı İkinci Beyin kaydı |

## İletişim kalitesi kuralı

Telegram bot kısa, net, işlem odaklı konuşacak.

Kötü örnek:

```text
İşleminiz değerlendirme sürecine alınmıştır.
```

Doğru örnek:

```text
Su faturası kaydını açtım.
Son gün: 15 Haziran
Tutar: 480 TL
Hatırlatma: 3 gün önce
```

## İkinci Beyin çeşitlendirme kapsamı

Sistem sadece ödenecekler/yapılacaklar değildir.

Şunları da kapsar:

- Yenilenecekler
- Süresi dolacaklar
- Belgesi eksik olanlar
- Kontrol edilecekler
- Aile işleri
- Sağlık işleri
- Resmi işler
- Araç işleri
- Ev işleri
- Abonelikler
- Sözleşmeler
- Riskli gecikmeler
- Bekleyen kararlar
- Takip edilecek hedefler
- Alışkanlıklar ve rutinler

## v58 MVP sırası

1. İkinci Beyin SQL tabloları
2. Telegram mesaj log tablosu
3. Hayat Komuta Merkezi preview ekranı
4. Telegram komut formatter
5. `/bugun`, `/hafta`, `/gecikenler`, `/ekle` komutları
6. Kayıt taslağı + onay mantığı
7. Program içi AperiON Asistan paneli
8. Belge/Drive bağlantısı

## Yapılanlar

- Telegram ana iletişim kanalı olarak belirlendi.
- Program içi bot/yapay zekâ mümkün ve gerekli olarak tanımlandı.
- Kural tabanlı bot + yapay zekâ destekli asistan ayrımı yapıldı.
- Doğal dil, belge, fotoğraf ve PDF üzerinden kayıt açma hedefi yazıldı.

## Kalanlar

- SQL tabloları oluşturulacak.
- Telegram bot v58 dosyaları eklenecek.
- Program içi asistan paneli tasarlanacak.
- Hayat Komuta Merkezi preview ekranı yapılacak.
- Telegram komut testleri yazılacak.
