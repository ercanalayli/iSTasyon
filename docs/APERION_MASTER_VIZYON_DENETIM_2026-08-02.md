# AperiON Master Vizyon — Kanıt Bazlı Denetim (2026-08-02)

`docs/APERION_MASTER_VIZYON.md`'deki 50 bölümün her biri, gerçek kod
(`C:\AperiON\iSTasyon`), gerçek Supabase şeması/veri sayıları (project
`iilfwosoroflzubkaryj`) ve mevcut GitHub Actions workflow'ları taranarak
denetlendi. Hiçbir madde koda bakılmadan "yapıldı" sayılmadı. Kanıt
yoksa **eksik**, kanıt var ama kullanılmıyorsa (şema var, veri yok)
**kısmen mevcut**, iki farklı mekanizma aynı işi çelişkili şekilde
yapıyorsa **çelişkili** olarak işaretlendi.

Yöntem: kritik/çekirdek finans-banka-BizimHesap-dashboard bölümleri
(5,7-16,21-22,33-35,38,47-49) bu oturumda zaten aylardır/saatlerdir
üzerinde çalışılan kod üzerinden doğrudan grep+SQL ile; belge/varlık/
bilanço (17-20), iletişim/mobil/aile/AI-rolleri (36-46) ve ileri finans
motorları (23-32) üç ayrı arka plan ajanı ile bağımsız taranıp
sonuçları birleştirildi.

## Özet tablo

| # | Bölüm | Durum |
|---|---|---|
| 5 | Master Kart Sistemi | **kısmen mevcut** |
| 6 | Hukuki Malik / Ekonomik Sahiplik | **eksik** |
| 7 | Kayıt Yaşam Döngüsü (17 adım) | **kısmen mevcut** |
| 8 | Onay Merkezi | **kısmen mevcut, çelişkili** |
| 9 | Denetim İzi / Audit | **kısmen mevcut** |
| 10 | Kritik Ödemeler Tek Merkez | **kısmen mevcut** |
| 11 | Sabit/Değişken Gider Yönetimi | **kısmen mevcut** |
| 12 | Gmail ve E-posta Merkezi | **kısmen mevcut, kritik arıza var** |
| 13 | Banka Ekstre ve Hareket Merkezi | **mevcut** |
| 14 | BizimHesap Entegrasyonu | **kısmen mevcut** (okuma güçlü, yazma hiç çalışmamış) |
| 15 | POS ve Moka | **kısmen mevcut** |
| 16 | Vergi/SGK/Beyanname/Tahakkuk | **eksik** |
| 17 | Mevzuat ve Yasal Yükümlülük Takibi | **eksik** |
| 18 | Belge Arşivi ve İkinci Beyin | **eksik** (tasarım var, uygulama yok) |
| 19 | Araç/Motosiklet/Gayrimenkul Varlık | **eksik** |
| 20 | Varlık Değerleme, Bilanço, Net Değer | **kısmen mevcut, çelişkili** (şirket-only, kendi UI'ı "kesin değil" diyor) |
| 21 | Finansal Netlik / CEO Cockpit | **kısmen mevcut** |
| 22 | Satış, Kâr ve Operasyon Analitiği | **mevcut** (kategori matrisi güçlü) |
| 23 | Anomali, Risk ve Denetçi Motoru | **kısmen mevcut** |
| 24 | Nakit Akışı ve Tahmin Motoru | **kısmen mevcut** (3 nokta var, 7/15/30/45/90 gün yok) |
| 25 | Borç Tasfiye ve Optimizasyon Motoru | **eksik** |
| 26 | Gider Kaçağı / Kâr Kaçağı Dedektörü | **eksik** |
| 27 | Gelir Dayanıklılığı ve Yeni Gelir Motoru | **eksik** |
| 28 | Yan İş Doğrulama Motoru | **eksik** |
| 29 | Otomatik Tasarruf ve Fon Motoru | **eksik** |
| 30 | Utançsız Bütçe ve Yaşam Dengesi | **eksik** (iskelet tablo var, veri/mantık yok) |
| 31 | Davranışsal Zekâ / Dürtüsel Harcama | **eksik** |
| 32 | Finansal Zihniyet / 21 Günlük Sıfırlama | **eksik** |
| 33 | Müşteri/Tedarikçi/Cari Analizi | **kısmen mevcut** |
| 34 | Stok ve Ürün Zekâsı | **kısmen mevcut** (Hasta Bezi güçlü, diğer 14 kategori zayıf) |
| 35 | Nakliye / Murat Ticaret Modülü | **eksik/doğrulanmamış** |
| 36 | İletişim Merkezi (Telegram/WhatsApp/Mail) | **kısmen mevcut** (Telegram güçlü, WhatsApp yok) |
| 37 | Google Drive Dosya Takibi | **eksik** |
| 38 | Proje Hafızası ve Bilgi Grafı | **kısmen mevcut** (docs/ konsolidasyonu var, "Knowledge Card" yapısı yok) |
| 39 | İngilizce Öğrenme Entegrasyonu | **eksik** (koda değil, sadece Claude'un kendi hafızasına bağlı) |
| 40 | Aile ve Ege Üst Akıl Kapsamı | **eksik** |
| 41 | Sağlık ve Hayat Asistanı | **eksik** |
| 42 | Sosyal Medya ve Pazarlama Operasyonu | **eksik** |
| 43 | Üst Akıl AI Rolleri (CFO/COO/Auditor...) | **eksik** (kavramsal, isimlendirilmiş modül yok) |
| 44 | Günlük Yönetici Özeti | **kısmen mevcut** (dağınık — mail digest ayrı, banka digest ayrı) |
| 45 | Bildirim Politikası | **kısmen mevcut** |
| 46 | Mobil, PWA, Tek Ekran Deneyimi | **mevcut** |
| 47 | Dashboard ve Raporlama Standartları | **kısmen mevcut** (ısı renkleri/drill-down bugün eklendi, trend grafiği yok) |
| 48 | Güvenlik ve Gizlilik | **kısmen mevcut** (RLS açığı 2026-07-30'da kapatıldı, ama bkz. not) |
| 49 | Geliştirme ve Proje Yönetimi Kuralları | **çelişkili** (kural: branch+test+onay; fiili: main'e doğrudan push) |

## Öne çıkan somut kanıtlar

- **Onay Merkezi ikiye bölünmüş, ama biri tamamen ölü (düzeltme, 2026-08-02 devam denetimi):** `pending_bank_movements` (2.016 kayıt, 38 onaylı) mail-kaynaklı ekstrelerin GERÇEK, canlı onay hattı. Ayrı bir `aperion_approval_center` tablosu, Telegram fotoğraf/görsel ekstre botu (`aperion_bank_image_bot.cjs`) için tasarlanmış ama bu bot **hiçbir GH Actions workflow'una bağlı değil**, beslediği `bank_transactions_raw` tablosu da 0 satır — yani bu ikinci kanal hiç tetiklenmemiş, aktif bir çelişki değil, tamamen kullanılmayan/bağlanmamış kod. Vizyonun "Telegram ve web onay merkezi aynı kayıtları göstermeli" kuralı teknik olarak sağlanmıyor ama bunun nedeni aktif çakışma değil — ikinci kanalın hiç devreye alınmamış olması. Düşük risk, acil değil; ileride foto-ekstre kanalı açılırsa o zaman birleştirme kararı gerekir.
- **BizimHesap yazma yönü hiç çalışmamış:** `bizimhesap_posting_queue` ve `bizimhesap_posting_log` **0 satır**. Okuma yönü (satış/masraf/ürün çekme) bugün dahil defalarca test edilip düzeltildi ve güçlü, ama "onaylanan banka hareketini BizimHesap'a yaz" yönü — vizyonun 14. bölümün can alıcı kuralı — bırakın canlıyı, tek bir test kaydı bile geçmemiş. `card-bizimhesap` panelinin kendi metni bunu doğruluyor: *"Zincir 'Onay' adımında bekliyor; BizimHesap kaydı 0."*
- **Master Kart sistemi neredeyse hiç yok:** Vizyon 30 kart tipi tanımlıyor (araç, gayrimenkul, kişi, aile üyesi, poliçe, sözleşme, vergi yükümlülüğü...). Gerçek veri seti (`data/master_data_cards_masked.json`) sadece **2 tip** içeriyor: banka hesabı ve abonelik. Araç/gayrimenkul/kişi/aile kartları şemada bile yok.
- **Gmail OAuth şu an kırık** (bu oturumun kendi hafıza kaydı, `project_gmail_oauth_broken_2026-08-01.md`): mail-ekstre okuma pipeline'ı gün içinde 3 kez OAuth adımında başarısız oldu — Section 12'nin en temel kanıt kaynağı şu an durmuş durumda. Bu, bugüne kadar hiç düzeltilmediyse en yüksek öncelikli arızadır.
- **Şahsi/aile finans katmanı büyük ölçüde iskelet:** `personal_finance_budget_rules`, `personal_finance_alerts`, `personal_finance_obligations`, `personal_finance_payments`, `finance_documents`, `personal_finance_documents` — hepsi **0 satır**. Şema tasarlanmış, kart tipleri düşünülmüş, ama hiç veri girmemiş/kullanılmamış.
- **Geliştirme kuralı ihlali (kendi kendine not):** Vizyon 49. bölüm "doğrudan main üzerinde kontrolsüz değişiklik yapılmamalı, branch+test+onay olmalı" diyor. Bu oturum dahil, iSTasyon reposundaki güncel akış her değişikliği doğrudan `main`'e push ediyor (branch/PR yok). Bu, Ercan'ın kendi onayıyla süregelen bir çalışma şekli ama vizyon dokümanının kendi kuralıyla açıkça çelişiyor — bilinçli bir seçimse dokümana not düşülmeli, değilse süreç değişmeli.
- **Gerçekten güçlü olanlar:** Banka ekstre/hareket merkezi (13), satış-kâr analitiği (22, bugünkü ısı rengi/marj/YoY eklemeleriyle), mobil PWA (46), Telegram bildirim altyapısı (dedup/cooldown dahil).

## Öncelik sırası (vizyonun kendi sıralamasına göre, kanıtla ayarlanmış)

1. **Gmail OAuth'u onar** — Section 12'nin tüm mail-kaynaklı kanıt zinciri buna bağlı, şu an durmuş.
2. **Onay Merkezi'ni birleştir** — `aperion_approval_center` ile `pending_bank_movements`'i tek kaynağa indir, ya da ikisinin neden ayrı kaldığını belgeye yaz.
3. **BizimHesap yazma yönünü gerçekten devreye al** — plan zaten onaylı (`robust-booping-bee.md`), 38 onaylı kayıt bekliyor, kod hiç yazılmadı.
4. **Denetim izini zenginleştir** — mevcut `audit_logs` iyi bir temel (2,3M satır) ama `approved_by`, `rule_version`, `correlation_id` alanları eksik.
5. **Finansal netlik/CEO Cockpit'i tamamla** — bugün ısı renkleri/marj eklendi, ama vizyonun istediği "ilk bakışta 8 sayı" (nakit, net değer, 30 günlük yük vb.) hâlâ dağınık.
6. Bundan sonrası (anomali motoru zenginleştirme, nakit projeksiyonunu 7/30/90 güne genişletme, üst akıl motorları) — gerçek veri omurgası ve onay/audit tamamlanmadan başlanmamalı, vizyonun kendi kuralı da bunu söylüyor.

**Kapsam dışı / muhtemelen hiç başlanmayacak kadar erken:** Aile/Ege modülü, sağlık asistanı, İngilizce öğrenme, sosyal medya otomasyonu, borç optimizasyon motoru, davranışsal harcama koruması, 21 günlük sıfırlama, yan-iş doğrulama motoru — bunların hiçbiri için kod/şema kanıtı yok, hepsi şu an sadece bu vizyon dokümanında var.

## İlk güvenli geliştirme paketi (2026-08-02 devam denetimiyle güncellendi)

1. **Gmail OAuth tanı ve onar** — kök neden GH Actions log'undan doğrulandı
   (`invalid_grant`, `GOOGLE_REFRESH_TOKEN` geçersiz). Yeniden izin akışı için
   `gmail-oauth-reauth-helper.yml` workflow'u eklendi; Ercan'ın PC başında
   3 adımlık interaktif onayı gerekiyor — **bu adım kullanıcı bekliyor,
   otomatikleştirilemez** (Google hesabına giriş gerektirir).
2. ~~Onay Merkezi birleştirme~~ — **iptal edildi, gerek yok**: incelemede
   `aperion_approval_center`'ın beslediği Telegram foto-kanalı hiçbir
   workflow'a bağlı değil ve tamamen boş; aktif bir çelişki yok, sadece
   kullanılmayan kod. Acil değil.
3. ~~`audit_logs`'a `approved_by` kolonu~~ — **iptal edildi**: `aperion_users`
   tablosu tek-operatör rol tablosu (isim/e-posta yok, sadece
   firma+rol), ve onay ekranlarında (`gunluk-banka-karar.html` vb.) hiç
   login/oturum sistemi yok — yani "kim onayladı" sorusunun anlamlı bir
   cevabı şu an teknik olarak yok (her zaman "Ercan" olurdu). Bunu
   eklemek gerçek bir kimlik/oturum sistemi gerektirir, bu "küçük/düşük
   riskli" paketin kapsamı dışına taşar — ayrı bir karar/oturum konusu.
4. **Sıradaki gerçek aday: BizimHesap yazma yönünü devreye almak** (plan
   zaten onaylı, `robust-booping-bee.md`) — 38 onaylı banka hareketi
   bekliyor, `bizimhesap_posting_queue`/`log` hâlâ 0 satır. Bu, gerçek
   muhasebe kaydı yazdığı için önce Ercan'la kapsam teyidi + PC başında
   canlı doğrulama gerektirir, "otomatik ve sessizce ilerlenecek" bir
   iş değil.
