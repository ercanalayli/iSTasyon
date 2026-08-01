# AperiON Mail Otomasyonu Nihai Yol v1

Bu işte kullanıcının tekrar tekrar yönlendirme yapmasına gerek yok. En sağlam ve en kolay yol bu dokümanda sabitlendi.

## Nihai hedef

AperiON, ALAYLI Medikal'in mail hesabındaki banka ekstrelerini otomatik okuyacak, banka hareketlerini çıkaracak, Onay Merkezi'ne düşürecek ve kullanıcı tek tuşla onaylayınca BizimHesap'a işlenecek kuyruğa alacaktır.

## Kullanılacak mail

```text
alaylimedikal@gmail.com
```

Bu akışta kullanılmayacak mailler:

```text
alkammaliyonetim@gmail.com
ercanalayli@gmail.com
```

## Seçilen mimari

### Ana yol: Gmail API / OAuth

Gmail API ile alaylimedikal@gmail.com hesabı okunur. Bu yol bilgisayar açık olmasa bile çalıştırılabilir altyapıya en uygun yoldur.

### Yedek yol: Windows açılış botu

Bilgisayar açıldığında zamanlanmış görev ile AperiON mail worker çalıştırılır. Bu yol yerel kullanım ve hızlı başlangıç için tutulur.

## Çalışma şekli

1. Bot belirli aralıklarla mail kutusunu tarar.
2. Banka ekstre maillerini bulur.
3. PDF/TXT/CSV eklerini alır.
4. PDF metne çevrilir.
5. Banka parser'ı hareketleri çıkarır.
6. duplicate_key ile mükerrer kontrol yapılır.
7. Kayıtlar pending_bank_movements tablosuna düşer.
8. Onay Merkezi bunları gösterir.
9. Kullanıcı tek tuşla onaylar.
10. Kayıt bizimhesap_queue tablosuna düşer.
11. BizimHesap işleyici bot kaydı işler.

## Bitme kriteri

Aşağıdaki cümle gerçek çalışmadan iş bitmiş sayılmaz:

```text
Mail geldi, AperiON aldı, hareketleri çıkardı, Onay Merkezi'ne attı, kullanıcı tek tuşla onayladı, kayıt BizimHesap kuyruğuna düştü.
```

## Komutlar

```bash
cd automation
npm run preflight
npm run mail:check
npm run monitor
```

## Kural

Preflight OK olmadan mail otomasyonu hazır kabul edilmeyecek.
