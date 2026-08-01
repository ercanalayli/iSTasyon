# AperiON Mail Ekstre Otomasyonu v1

Bu projenin ana işi otomasyondur. Kullanıcı PDF'i manuel olarak ChatGPT'ye atmayacak. AperiON belirli zamanlarda mail kutusunu kontrol edecek, banka ekstrelerini okuyacak, analiz edecek, Onay Merkezi'ne düşürecek ve kullanıcı tek tıkla onayladıktan sonra BizimHesap'a işleme akışını başlatacaktır.

## Sabit kural

- Ana firma: ALAYLI Medikal
- Ana mail kutusu: alaylimedikal@gmail.com
- Alakasız mail: alkammaliyonetim@gmail.com bu akışa dahil değildir
- Ana ticari sistem: BizimHesap
- Banka ekstreleri kesin kayıt değildir; önce pending/onay havuzuna düşer
- Kullanıcı onayı olmadan BizimHesap'a kayıt işlenmez

## Otomasyon akışı

1. Zamanlayıcı çalışır
2. Gmail kutusunda banka ekstre mailleri aranır
3. Uygun ekler indirilir / okunur
4. Banka tipi algılanır
5. İlgili parser çalışır
6. Hareketler normalize edilir
7. duplicate_key üretilir
8. Daha önce işlenen kayıtlar elenir
9. Yeni hareketler pending_bank_movements havuzuna yazılır
10. AperiON ana ekranda sinyal çıkar
11. Kullanıcı Onay Merkezi'nde tek tık onaylar veya düzeltir
12. Onaylanan hareket BizimHesap işleme kuyruğuna düşer
13. Rapor üretilir

## Zamanlama

Varsayılan kontrol sıklığı:

- Gündüz: 08:00 - 20:00 arası her 15 dakika
- Gece: 20:00 - 08:00 arası saatte 1 kez
- Kullanıcı isterse manuel 'Şimdi kontrol et' butonu

## Gmail arama kuralları

Ana hedef mail kutusu:

```text
alaylimedikal@gmail.com
```

Aranacak genel ifadeler:

```text
has:attachment newer_than:7d
```

Banka bazlı aramalar:

### İş Bankası

```text
("Türkiye İş Bankası" OR "Turkiye Is Bankasi" OR "İş Bankası" OR "Is Bankasi" OR "Hesap Hareket" OR "Hesap Ekstre") has:attachment
```

### Yapı Kredi

```text
("Yapı Kredi" OR "Yapi Kredi" OR "Hesap_Hareketleri" OR "Hesap_Ozeti" OR "Hesap Özeti") has:attachment
```

### Vakıfbank

```text
("Vakıfbank" OR "Vakifbank" OR "E-Ekstre" OR "Hesap Özeti") has:attachment
```

### Halkbank

```text
("Halkbank" OR "T.HALK BANKASI" OR "Hesap Ekstresi") has:attachment
```

### Garanti BBVA

```text
("Garanti BBVA" OR "E-İmzalı Hesap Hareket" OR "Hesap Hareket Dökümü") has:attachment
```

## Pending kayıt şeması

```json
{
  "company_id": "alayli",
  "source": "gmail_bank_statement",
  "mailbox": "alaylimedikal@gmail.com",
  "bank_name": "İş Bankası",
  "mail_id": "gmail_message_id",
  "mail_subject": "...",
  "mail_from": "...",
  "mail_date": "...",
  "attachment_name": "...",
  "statement_id": "...",
  "statement_period": "...",
  "transaction_date": "...",
  "transaction_time": "...",
  "description": "...",
  "amount_in": 0,
  "amount_out": 0,
  "balance_after": 0,
  "detected_type": "tahsilat",
  "suggested_counterparty": "...",
  "confidence_score": 0,
  "status": "pending",
  "duplicate_key": "...",
  "created_at": "..."
}
```

## Mükerrer kontrol

Her hareket için duplicate_key üretilecek:

```text
BANKA|statement_id|tarih|saat|giris|cikis|bakiye|aciklama_key
```

Aynı duplicate_key varsa:

- Yeni pending kaydı açılmaz
- Log'a mükerrer deneme yazılır
- Kullanıcıya 'zaten işlenmiş' sinyali verilir

## Onay Merkezi

Onay Merkezi'nde her hareket şu butonlara sahip olacak:

- Onayla
- Reddet
- Düzelt ve Onayla
- Cari Seç
- Hareket Tipi Seç
- BizimHesap'a İşle

## BizimHesap işleme kuralı

Onaylanan hareket doğrudan değil, önce BizimHesap işlem kuyruğuna alınır.

Kuyruk statüleri:

- ready_for_bizimhesap
- processing
- processed
- failed
- needs_review

## Raporlama

Her kontrol turunda rapor üretilecek:

- Kaç mail tarandı
- Kaç ek bulundu
- Kaç hareket çıkarıldı
- Kaç yeni pending kayıt oluştu
- Kaç mükerrer elendi
- Kaç kayıt onay bekliyor
- Kaç kayıt BizimHesap kuyruğunda

## Kritik not

ChatGPT içindeki Gmail bağlantısı hangi hesaba bağlıysa sadece o hesabı görür. AperiON gerçek otomasyonu için alaylimedikal@gmail.com hesabının OAuth bağlantısı sistem tarafında ayrıca kurulmalıdır.
