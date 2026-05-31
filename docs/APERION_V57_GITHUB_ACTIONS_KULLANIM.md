# AperiON v57 — GitHub Actions Kullanım Rehberi

Bu rehber, telefondayken PowerShell'e sürekli kod yapıştırmadan v57 akışını GitHub üzerinden kontrol etmek için hazırlanmıştır.

## Amaç

v57 Cash Command Center + Gmail/Drive ekstre intake akışında mümkün olan işleri GitHub Actions üzerinden çalıştırmak.

## Çalıştırılacak workflow sırası

### 1. Verify v57 Cash Gmail Drive All

Önce bu workflow çalıştırılır.

Görevi:

- Cash Command Center SQL kontrolü
- Cash Command servis kontrolü
- Gmail/Drive intake kontrolü
- Gelen Ekstreler UI kontrolü
- Preview link patch kontrolü

Beklenen sonuç:

```text
success
```

Hata verirse merge/deploy yapılmaz. Hata loguna göre düzeltme yapılır.

### 2. Apply Preview Links v57

İlk workflow başarılı olursa bu workflow çalıştırılır.

Görevi:

- `npm run apply:preview-links-v57` çalıştırır.
- `index.html` içine şu linkleri ekler:
  - `nakit-komuta-v57.html`
  - `gelen-ekstreler-v57.html`
- Değişiklik varsa otomatik commit/push yapar.

Beklenen commit mesajı:

```text
feat: expose v57 preview links on dashboard
```

### 3. Tekrar Verify v57 Cash Gmail Drive All

Apply sonrası tekrar ana verify çalıştırılır.

Beklenen sonuç:

```text
success
```

## GitHub arayüzünden çalışma adımları

1. GitHub reposuna gir.
2. Üst menüden `Actions` sekmesine gir.
3. Sol taraftan `Verify v57 Cash Gmail Drive All` workflowunu seç.
4. `Run workflow` butonuna bas.
5. Branch olarak şunu seç:

```text
feature/v57-cash-command-center
```

6. Yeşil başarılı sonucu bekle.
7. Sonra `Apply Preview Links v57` workflowunu seç.
8. Yine branch olarak şunu seç:

```text
feature/v57-cash-command-center
```

9. Çalıştır.
10. Başarılı olursa tekrar `Verify v57 Cash Gmail Drive All` çalıştır.

## Güvenlik notu

Bu workflowlar:

- BizimHesap’a kayıt göndermez.
- Bankaya giriş yapmaz.
- Kesin finans kaydı oluşturmaz.
- Sadece dosya, UI linki, SQL/JS doküman ve verify kontrolü yapar.

## Başarılı sayılması için

- `Verify v57 Cash Gmail Drive All` başarılı olmalı.
- `Apply Preview Links v57` başarılı olmalı.
- Apply sonrası `index.html` içinde iki link görünmeli:
  - `nakit-komuta-v57.html`
  - `gelen-ekstreler-v57.html`
- Son verify tekrar başarılı olmalı.

## Sonraki aşama

GitHub tarafı başarılı olduktan sonra gerçek kurulum sırası:

1. Supabase SQL kurulumu
2. Apps Script kurulumu: `alaylimedikal@gmail.com`
3. Demo ekstre kaydı testi
4. Gerçek banka ekstresi testi
5. Parser → Onay Merkezi bağlantısı

## Yapılanlar

- GitHub Actions çalışma sırası belirlendi.
- Telefonda izlenebilir adımlar yazıldı.
- PowerShell bağımlılığı azaltıldı.

## Kalanlar

- Workflowlar GitHub arayüzünden manuel çalıştırılacak.
- Sonuçlara göre PR #2 güncellenecek.
