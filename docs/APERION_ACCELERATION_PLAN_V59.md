# AperiON v59 — Hızlandırma Planı

## Amaç

AperiON geliştirmesini tek kişi/tek kanal mantığından çıkarıp paralel üretim hattına almak.

Ana prensip:

```text
ChatGPT = mimar + entegratör + kontrolcü
Gemini = yardımcı geliştirici + denetçi + alternatif çözüm üretici
GitHub = tek doğru kod deposu
Supabase = tek doğru veri deposu
Telegram = komuta ve test kanalı
```

## Güvenlik Kuralı

Gemini veya başka bir yardımcı araca asla şu bilgiler verilmez:

```text
Supabase service role key
Telegram bot token
Google hesap şifreleri
Gmail yetki ekranları
Drive özel dosya linkleri
Gerçek müşteri kişisel verileri
```

Yardımcı araçlara sadece kod, şema, dummy test verisi ve görev açıklaması verilir.

## Hızlandırma Modeli

### Hat 1 — Çekirdek Mimari

Sahip: ChatGPT

Görevler:

```text
SQL şemaları
Veri akışı
ID/fingerprint kuralları
Onay merkezi kuralları
Modüller arası bağlantılar
```

### Hat 2 — UI / Ekranlar

Sahip: Gemini destekli

Görevler:

```text
Belge Merkezi ekranı
Finans Onay Merkezi ekranı
Komuta Merkezi ekranı
Hafıza Merkezi ekranı
Mobil uyum iyileştirme
```

### Hat 3 — Parser / Test

Sahip: Gemini destekli

Görevler:

```text
PDF örneklerini ayrıştırma
Excel/CSV örneklerini test etme
Regex iyileştirme
Banka bazlı parser önerileri
Moka raporu formatı inceleme
```

### Hat 4 — Kontrol / Denetim

Sahip: ChatGPT + Gemini çapraz kontrol

Görevler:

```text
Mükerrer kayıt kontrolü
Bozuk referans kontrolü
SQL view kontrolü
Gizli anahtar var mı kontrolü
Kırılan eski özellik var mı kontrolü
```

## Gemini’ye Verilecek Standart Görev Formatı

```text
AperiON projesinde şu dosyayı iyileştir:
<dosya adı>

Amaç:
<amaç>

Kurallar:
- Mevcut özellikleri silme.
- Gizli anahtar ekleme.
- Sadece dummy veri kullan.
- Türkçe arayüz kullan.
- Light tema korunsun.
- Önce sorunları listele, sonra önerilen kodu ver.

Beklenen çıktı:
- Değiştirilecek satırlar
- Neden değiştiği
- Test adımları
```

## Paralel Sprint Planı

### Sprint A — Canlı Test Kilidi

Hedef:

```text
Mail eki → Drive → Belge Merkezi → Finans Onay → Telegram
```

Görevler:

```text
1. Supabase SQL dosyaları sırayla çalıştırılır.
2. Apps Script property değerleri girilir.
3. Test PDF gönderilir.
4. Belge Merkezi’nde görünür.
5. Finans Onay Merkezi’ne düşer.
6. Telegram /belgeler ve /onaylar cevap verir.
```

### Sprint B — Parser ve Ledger

Hedef:

```text
Aynı PDF tekrar işlenmesin.
Her satırın transaction ID değeri olsun.
```

Görevler:

```text
1. Banka parser test edilir.
2. Ledger tabloları test edilir.
3. Aynı dosya iki kez denenir.
4. Mükerrer yakalanır.
```

### Sprint C — Moka

Hedef:

```text
Moka bekleyen tahsilat ↔ banka geçişi eşleşsin.
```

Görevler:

```text
1. Moka beklenen tahsilat dummy kayıtları girilir.
2. Banka hareketi yüklenir.
3. generate_moka_reconciliation_suggestions_v59 çalıştırılır.
4. Öneri oluşur.
5. Onay sonrası eşleşme kapanır.
```

### Sprint D — Komuta Merkezi

Hedef:

```text
/bugun, /onaylar, /belgeler, /moka, /sonekstre komutları çalışsın.
```

## Hız Kazandıracak Net Kurallar

```text
1. Yeni modül açma; önce canlı test hattını bitir.
2. Her modül için önce SQL, sonra servis, sonra ekran, sonra Telegram.
3. Her dosyaya doğrulama scripti ekle.
4. Her işlemde yapılanlar/kalanlar/kontrol edilenler yaz.
5. Gerçek veriyle test etmeden yeni vizyon ekleme.
```

## Tahmini Süre

### Minimum çalışan v1

```text
3-4 hafta
```

Şart:

```text
Canlı Gmail/Drive/Supabase/Telegram testi hızlı geçerse.
```

### Kullanılabilir AperiON v1

```text
6-8 hafta
```

Şart:

```text
Banka, Moka, Onay Merkezi ve Telegram birlikte çalışırsa.
```

### AperiON OS yönü

```text
6-12 ay
```

Şart:

```text
Veri düzenli akarsa ve modüller tek tek kapanırsa.
```

## Yapılanlar

```text
✅ Hızlandırma modeli belirlendi.
✅ Gemini yardımcı rolü tanımlandı.
✅ Güvenlik sınırları belirlendi.
✅ Paralel sprintler belirlendi.
```

## Kalanlar

```text
⬜ Gemini için ilk görev paketi hazırlanacak.
⬜ Canlı test SQL sırası net dokümante edilecek.
⬜ Komuta Merkezi v59 görevleri açılacak.
⬜ İlk canlı PDF testi yapılacak.
```
