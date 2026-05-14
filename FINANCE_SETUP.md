# AperiON Finans Takvimi Kurulum Rehberi

Bu rehber AperiON / ErpaltH iSTasyon projesindeki Finans Takvimi ve Nakit Akışı Merkezi için hazırlanmıştır.

## 1. Dosyalar

- `aperion-finans-takvimi-live.html`: Canlıya hazır finans ekranı.
- `finans-takvimi.html`: Güvenli başlatıcı sayfa.
- `supabase_finans_takvimi_schema.sql`: Supabase tablo ve view şeması.
- `supabase_finans_demo_seed.sql`: Test/demo verileri.
- `finance_supabase_adapter.js`: Supabase veri erişim katmanı.
- `finance_approval_actions.js`: Onay / red aksiyon katmanı.
- `finance_import_bridge.js`: BizimHesap/banka/Moka ham veri normalizasyonu.
- `moka_united_reconciliation.js`: Moka United mutabakat öneri motoru.
- `turkiye_business_calendar.js`: Türkiye iş günü ve resmi tatil kontrolü.
- `finance_dashboard_embed.html`: Ana dashboard içine gömülebilir iframe section.

## 2. Supabase tablo kurulumu

En güvenli yol:

1. Supabase Dashboard aç.
2. SQL Editor bölümüne gir.
3. `supabase_finans_takvimi_schema.sql` içeriğini çalıştır.
4. Hata yoksa `supabase_finans_demo_seed.sql` içeriğini test için çalıştır.

Alternatif runner:

```bash
npm install @supabase/supabase-js
cp .env.example .env
node supabase_finance_migration_runner.js
node supabase_finance_migration_runner.js --seed
```

Not: Runner, Supabase tarafında `exec_sql(sql_text text)` RPC fonksiyonu yoksa çalışmaz. Bu durumda SQL Editor kullan.

## 3. Live-ready ekran bağlantısı

`finans-takvimi.html` başlatıcıdır. Buradan `aperion-finans-takvimi-live.html` açılır.

Live-ready ekranda:

1. Canlı Bağlantı sekmesine gir.
2. Supabase URL gir.
3. Supabase anon key gir.
4. Kaydet ve Bağlan butonuna bas.

Bağlantı başarılıysa `finance_calendar_records` tablosundan canlı veri okunur. Bağlantı yoksa demo mod çalışır.

## 4. Ana index.html içine güvenli gömme

`finance_dashboard_embed.html` içeriği ana dashboard içine section olarak eklenebilir. Kör güncelleme yapılmamalı; mevcut `index.html` büyük tek dosya olduğu için önce manuel/diff kontrolü yapılmalı.

Menü snippet'i:

```html
<div class="sb-item" onclick="window.location.href='finans-takvimi.html'">
  <div class="sb-ico">💰</div>
  <div>
    <div class="sb-lbl">Finans Takvimi</div>
    <span class="sb-sub">Nakit Akışı Merkezi</span>
  </div>
</div>
```

## 5. Onay Merkezi akışı

Kaynak veri doğrudan kesin kayıt olmaz:

Kaynak veri → normalize → güven puanı → Onay Merkezi → kullanıcı onayı → kesin finans kaydı

Onaylanınca:

- `approval_status = onaylandi`
- `status = bekliyor`

Reddedilince:

- `approval_status = reddedildi`
- `status = iptal`

## 6. Moka United akışı

POS tahsilatı önce Moka United hesabında bekler. Bankaya geçiş tarihi takip edilir. Banka hareketi geldiğinde `moka_united_reconciliation.js` güven puanlı eşleşme önerisi üretir. Onaydan sonra tahsilat kesinleşir.

## 7. Çek / senet / ödeme tarihi

Asıl vade tarihi korunur. Fiili ödeme tarihi hafta sonu veya Türkiye resmi tatiline denk gelirse ilk iş gününe taşınır.

## 8. Korunan kurallar

- ALKAM Mali adı kullanılmaz.
- AperiON / ErpaltH iSTasyon projesidir.
- Şirketler korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Mevcut index.html özellikleri silinmez.
- Supabase / Chart.js / tek dosya frontend mantığı korunur.
