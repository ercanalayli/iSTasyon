# A1 — ALAYLI MEDİKAL Hasta Bezi Operasyon / ERP-CFO-İç Kontrol Standardı

**Aktif politika:** `A1-POLICY-20261010-v4` · **Kapsam:** 02–07.10.2026 tarihli 6 siparişlik sevkiyat grubu ve sonraki A1 işlemleri için denetim standardı · **Kaynak:** 10.10.2026 kullanıcının bu sohbette paylaştığı 17 bölümlü tam talimat.  
**Yerine geçtiği:** `A1-POLICY-20261009-v3`. Bu sürüm özellikle **sabit 1.500 TL lojistiği İPTAL eder**, rota/yakıt maliyetine bağlı olmayan kâr değerini FINAL yapmayı yasaklar ve **14 kolonlu** ERP/Audit müşteri tablosunu tanımlar. Eski kayıtlar SİLİNMEZ; kaynak+eski/yeni değer+değişiklik zamanı ile audit'te kalır.

## 1 — Kanıt ve audit kilidi

Belge, ekran görüntüsü, fatura, dekont, resmi fiyat listesi, BizimHesap canlı kaynak kaydı, yazılı teyit veya doğrulanabilir sistem kanıtı olmadan **VERIFIED / FINAL / FATURA KESİM HAZIR** denemez. `BLOCKED — EVIDENCE MISSING` ve eksik belge yazılır. Her kritik veri mümkün olduğunda `source_id, source_type, source_document, verified_at, verified_by, old_value, new_value, revision_reason, version, evidence_status` taşır. Eski değer silinmez: `OLD → NEW → SOURCE → TIMESTAMP`. Tüm mutabakatlarda gerçek kaynakla geri okuma gerekir.

## 2 — A1 sürümü ve zincirleme recalculation

`A1-YYYYMMDD-vN`; yeni doğrulanmış değişiklikte eski sürüm `SUPERSEDED` yapılır, satırlar ve müşteri/master alanları baştan hesaplanır: paket/balya/toplam adet, satır net, KDV, müşteri/grup toplamları, FIFO tüketimi, kâr, rota/yük. Audit bloke edilen alanları 0 TL gibi gösterme. Önceki master toplamını körlemesine devralma.

## 3 — Bu altı siparişli sevkiyat grubu: satış fiyatı

Mayıs **2026** KAR-DAĞ resmî KDV-hariç paket liste bedeli × **0,97**; sonra %10 KDV. Kaynak talimat: “Tüm siparişler mayıs listesi 3 iskonto yapılacak.” Bu **mevcut altı sipariş grubunun** fiyatı; daha sonraki bağımsız müşteri/siparişlere global %3 zorlanmaz. Ekim 2026 tarihli Gamze özel siparişinin %3 kuralı ayrıca onaylıdır. `NetHrç=MayısListeHrç*0.97`; `KDV_Dahil_Paket=NetHrç*1.10`. BizimHesap'ın gerçek satır kuruş yuvarlaması doğrulanmazsa `ROUNDING RECONCILIATION`. İskonto sonrası birim fiyat gönderiliyorsa API'de aynı %3'ü ikinci kez indirme: **DOUBLE DISCOUNT YASAK**. Kaynaksız ek iskonto yasak.

## 4 — Ürün master

Ürün adı serbest WhatsApp yazımı değil, **BizimHesap doğrulanmış tam ürün adı**. Yanına MAM SKU, paket içi birim, balya/koli içi paket değerini Mayıs 2026 resmî liste + ürün kartından al. Bu değerleri genel 4/6/30 varsayımıyla doldurma. Tekil eşleşme yoksa `BLOCKED`.

## 5 — Hakan Atasert kaynaklı kesin revizyon

`0040 HAKAN ATASERT`, `2026 JENDER HASTA BEZİ XXLARGE 20'Lİ*6`: **OLD 4 paket → NEW 6 paket**, kanıt WhatsApp yazılı teyit + ekran görüntüsü. 1 paket 20 adet; 1 balya 6 paket = 120 adet; 6 paket = 1 tam balya + 0 açık paket. Mayıs liste 560,3904; %3 sonrası net 543,5787; KDV dahil paket 597,9366; 6 paket net yaklaşık 3.261,47, KDV dahil 3.587,62. Hakan ve master tekrar toplansın.

## 6 — Tevkifat

Hasta bezi ürün grubunda kullanıcı teyidiyle **YOK/0,00 TL**. Diğer ürün veya hizmetlere genellenmez. İlgili mevzuat/vergi politikası doğrulama belgesi mümkün olduğunda bağlanır.

## 7 — Lojistik/yakıt (EN KRİTİK DEĞİŞİKLİK)

**Eski kural:** Sipariş başına 1.500 TL, altı siparişte 9.000 TL = **İPTAL / SUPERSEDED**. Rota kesinleşmeden sabit gider yazma. Çıkış `0000 İNEGÖL DEPO`, doğrulanmış teslimat adresi ve ara stoplar, dönüş `9990 İNEGÖL DEPO`; her etap km + toplam km için kanıt. Kullanıcının “%10 yakıt gideri” ifadesinin gerçekten **10 litre/100 km** olup olmadığı açıklığa kavuşmadan tüketim/fiyat uydurma. Gerekliler: araç yakıt tipi, tüketim (L/100km) ve kanıt tarihi, litre fiyatı+tarihi. `Yakıt litre=Toplam km*L/100km/100`; `Yakıt TL=Yakıt litre*kanıtlı litre fiyatı`. Müşteri dağılımı: talep edilen basit eşit pay toplam yakıt/sipariş sayısı; mümkünse rota mesafesi/yük katkılı adil maliyet tahsisini ayrıca göster ve gerekçelendir. Adres veya yakıt parametresi yoksa `ROUTE BLOCKED` / `FUEL BLOCKED`; maliyet ve kâr FINAL olamaz.

## 8 — FIFO / COGS

Yalnız gerçek alış faturası, alış tarihi, MAM SKU, miktar, net maliyet, parti/lot ve FIFO tüketimi ile `FIFO/COGS VERIFIED`. Aksi hâlde `FIFO/COGS: BLOCKED — FIFO EVIDENCE MISSING`; net kâr, marj, getiri FINAL DEĞİL. Referans maliyet uydurulmaz.

## 9 — A1 tam rapor — sabit başlıklar, 14 sütun

`A1` mesajına **hiç soru sormadan**, doğrulanmış son verilerle **bütün müşteri satırlarını** içeren ERP/Audit raporu yaz. “A1 hazır” gibi kısa cevap yok. Her müşteri başlığı `STOP — MÜŞTERİ — PROFORMA/FATURA DURUMU`. Üst bilgiler: Sipariş Tarihi; Kaynak Liste; İskonto; KDV; Tevkifat; Ürün Kalem Sayısı; Sipariş Balya; Sipariş Paket; Toplam Adet; Proforma Durumu; Fatura Durumu; Sevkiyat Durumu; Evidence Status.

Sabit ürün tablosu kolon sırası:
1. Ürün
2. MAM Kodu
3. Sip.Pkt (**kalın**)
4. Pkt/Balya
5. Tam Balya
6. Açık Pkt
7. Paket İçi Adet
8. Toplam Adet
9. Mayıs Liste Hrç
10. %3 Sonrası Hrç
11. %3 Sonrası KDV Dahil / Pkt (**kalın**)
12. Top.Hrç
13. Top.Dhl
14. Evidence.

Müşteri altı: Mal/Hizmet Toplamı; KDV %10; Tevkifat Yok/0,00 TL; **GENEL TOPLAM**; Net Tahsilat/Ödenecek.

## 10 — Maliyet/kâr

FIFO kanıtı varsa Net Satış KDV Hariç; FIFO Ürün Maliyeti; Brüt Kâr; gerçek Yakıt/Lojistik Payı; Toplam Operasyon Maliyeti; Net Operasyon Kârı; Net Kâr Marjı; Maliyet Üzerinden Getiri. FIFO yoksa `FIFO/KÂR BLOCKED` ve mali kâr alanlarına uydurma rakam yok.

## 11 — Sevkiyat

`0000 İNEGÖL DEPO → 0010,0020,...,0060 → 9990 İNEGÖL DEPO`. Araya 0015 gibi stop numarası eklenebilir. Stop numarası **kimlik/sipariş sırası**, optimize edilmiş gerçek rota kanıtı değildir. Her stop: ID, tam balya, açık paket, toplam paket, toplam adet, adres/adres kanıtı, km, yakıt payı, sevkiyat durumu. Adres eksikse rota BLOCKED.

## 12 — Kanonik altı müşterilik sipariş grubu (A1 snapshot asıl ürün satırları esas)

| Stop | Müşteri | Sipariş | Satır | Tam balya | Paket |
|---|---|---|---:|---:|---:|
| 0010 | Kütahya Kardelen Medikal-2 | 02.10.2026 | 2 | 8 | 40 |
| 0020 | Zeybek Medikal / Kütahya | 06.10.2026 | 8 | 40 | 170 |
| 0030 | Seton Medikal / Eskişehir | 06.10.2026 | 12 | 24 | 96 |
| 0040 | Hakan Atasert | 06.10.2026 | 6 | 7 | 32 |
| 0050 | Atak Medikal | 06.10.2026 | 2 | 2 | 8 |
| 0060 | Akın Medikal | 07.10.2026 | 3 | 4 | 20 |

Kardelen: Jender XXL 24, Jender Bel L 16. Zeybek: Jender Külot M/L/XL 20'şer, Jender Bel S/M/L/XL 20'şer, Moly 60×90 30. Seton: Jender Bel M/L/XL, Jender Külot M/L/XL, Coverdry Bel M/L/XL, Coverdry Külot M/L/XL, her biri 8 paket. Hakan: Coverdry Bel M 8, Bel XL 4, **Jender XXL 6**, Coverdry Külot L 4, XL 4, Moly Serme 6. Atak: Coverdry Bel L 4, Bel XL 4. Akın: Coverdry Bel L 8, Jender Külot L 7'li 6, Lorina Mesane 30'lu 6. Tam detayların tek kaynağı `A1_SNAPSHOT` JSON'dur; audit kanıtı bulunmayan yeni ayrıntı uydurma.

## 13–14 — Master yeniden kontrolü

33 ürün satırından müşteri sayısı, ürün kalemi, tam/açık balya, paket, toplam adet, tüm net/KDV/brüt tutarlar, rota km/yakıt bağımsız yeniden toplanacak. **Beklenen kontrol:** 6 stop, 33 kalem, 85 tam balya, 0 açık paket, 366 paket. Kullanıcı verdi diye otomatik VERIFIED değil. Müşteri / ürün / master uyumsuzsa `CONTROL FAILURE` ve rapor FINAL değil.

## 15 — Durumlar ve ERP yaşam döngüsü

`VERIFIED`, `PROVISIONAL`, `BLOCKED`, `SUPERSEDED`, `NOT POSTED`, `POSTED`, `SHIPPED`, `CLOSED`. Geçiş: `DRAFT → VALIDATED → APPROVED → POSTED → SHIPPED → CLOSED`. Kaynak fatura no ve sevk tarihi yoksa **CLOSED YOK**; yalnız API GUID yeterli değildir.

## 16 — Zorunlu denetim paneli

A1 sonunda alan bazında ✅/🟡/🔴: Price Source, Discount Evidence, Product Master, Quantity Evidence, Packaging Evidence, VAT, Withholding Tax, Invoice Rounding, FIFO/COGS, Customer Address, Route KM, Fuel Calculation, Invoice Number, Shipment Date, Audit Trail. Son başlık `BUGÜN FATURA KESİLEBİLİR` veya `FATURA BLOKE` ve her engelin nedeni.

## 17 — Yeni kanıt geldiğinde çalışma sırası

1. Belgeyi oku.
2. Kanıtladığı alanı belirle.
3. Önceki veriyle karşılaştır.
4. Çelişen eski A1'i `SUPERSEDED` yap, silme.
5. **Tüm** bağlı rakamları tekrar hesapla.
6. Audit log yaz.
7. Yeni versiyon çıkar.

`A1'i değiştir` komutu olmadan **bu 10.10.2026 onaylı standardı** sessizce daraltma, tabloyu sadeleştirme veya hesap mantığını değiştirme. **A1 = denetlenebilir ERP operasyon belgesi, sohbet özeti değildir.**

### Üretim/emniyet sınırı

Bu politika kullanıcı tarafından getirilen kanonik A1 rapor standardıdır; tek başına BizimHesap faturası veya ödeme yapma izni değildir. Geçerli bir fatura için ayrıca kaynak eşleştirme, mükerrerlik denetimi ve işlem-özel açık onay gerekir. 1.500 TL iptali önceki satırı *yeniden yazmaz*; eski snapshot ve audit karşılaştırılarak ayrı saklanır.

**Asıl kaynaklar:**
- AperiON Kontrol Merkezi: https://docs.google.com/spreadsheets/d/155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc/edit
- KARDAĞ MAYIS 2026: https://drive.google.com/file/d/1Pt2r4JyKcGSa6SHDHDS8sx1T3lRHlu7u/view
