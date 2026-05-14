# AperiON Finans Takvimi Entegrasyon Notları

Bu dosya mevcut `index.html` dosyasını silmeden / bozmadan finans modülünü ana AperiON yapısına bağlamak için hazırlanmıştır.

## Oluşturulan dosyalar

- `aperion-finans-takvimi.html`  
  Ana finans modülü. Dashboard, Onay Merkezi, Satış Özeti ve Supabase Taslak sekmeleri var.

- `finans-takvimi.html`  
  Güvenli başlatıcı sayfa. Kullanıcı buradan finans modülünü açabilir.

- `supabase_finans_takvimi_schema.sql`  
  Finans Takvimi için Supabase tablo/view taslağı.

- `finance_import_bridge.js`  
  BizimHesap / banka / Moka / çek-senet ham verisini finans kayıt standardına çevirir. Kesin kayıt yapmaz, onaya düşürür.

- `finance_approval_center.js`  
  Onay Merkezi veri modeli.

- `sales_report_import_bridge.js`  
  Satış raporlarını finans tahsilat kuyruğuna dönüştürmek için yardımcı köprü.

- `data/sales_report_summary_2025_2026.json`  
  SATIŞ RAPORU (13), (14), (15) özetleri.

## index.html için güvenli menü ekleme snippet'i

Mevcut sidebar menüsünde uygun yere şu bağlantı eklenebilir:

```html
<div class="sb-item" onclick="window.location.href='finans-takvimi.html'">
  <div class="sb-ico">💰</div>
  <div>
    <div class="sb-lbl">Finans Takvimi</div>
    <span class="sb-sub">Nakit Akışı Merkezi</span>
  </div>
</div>
```

Alternatif olarak yeni sekmede açmak için:

```html
<div class="sb-item" onclick="window.open('finans-takvimi.html','_blank')">
  <div class="sb-ico">💰</div>
  <div>
    <div class="sb-lbl">Finans Takvimi</div>
    <span class="sb-sub">Nakit Akışı Merkezi</span>
  </div>
</div>
```

## Dashboard kartı olarak ekleme snippet'i

Ana dashboard kart alanına şu kart eklenebilir:

```html
<div class="kpi click" onclick="window.location.href='finans-takvimi.html'">
  <div class="kpi-l">AperiON Finans Takvimi</div>
  <div class="kpi-v">Nakit Akışı</div>
  <div class="kpi-s">Tahsilat / ödeme / Moka / çek-senet</div>
</div>
```

## Supabase canlıya geçiş sırası

1. Supabase SQL Editor içinde `supabase_finans_takvimi_schema.sql` çalıştırılacak.
2. Tablo oluşumu kontrol edilecek:
   - `finance_calendar_records`
   - `fixed_payment_contracts`
   - `variable_payment_items`
   - `moka_united_movements`
   - `turkiye_public_holidays`
   - `finance_cashflow_summary`
3. `aperion-finans-takvimi.html` demo veriden Supabase select akışına geçirilecek.
4. Onay butonları Supabase insert/update ile bağlanacak.
5. BizimHesap bot çıktısı `finance_import_bridge.js` üzerinden Onay Merkezi'ne düşürülecek.

## Güvenlik kuralı

Kesin kayıt yok. Her kaynak önce Onay Merkezi'ne düşer:

Kaynak veri → normalize → güven puanı → Onay Merkezi → kullanıcı onayı → Finans Takvimi kesin kayıt

## Korunan kurallar

- ALKAM Mali adı kullanılmaz.
- AperiON / ErpaltH iSTasyon projesidir.
- Şirket yapısı korunur: `alayli`, `woodlet`, `elit`, `odyoform`, `alkam`, `yenicespor`.
- Mevcut `index.html` özellikleri silinmez.
- Supabase / Chart.js / tek dosya frontend mantığı korunur.
