# AperiON CFO Modu Planı

Kaynak gorsel: `Cfo2026-07-03 - 21.29.33.png`

## Amaç

AperiON sadece rapor gosteren bir panel olmayacak. CFO gibi dusunen, finansal tabloyu okuyan, sorunu isaretleyen, karar onerisi ureten ve kullanici onayindan sonra aksiyon alan bir "Finans Direktoru modu" olacak.

Bu modul egitim listesi gibi durmayacak; her baslik canli veriye, risk skoruna, onay aksiyonuna ve rapora baglanacak.

## Ana CFO Başlıkları

1. Finans Departmanı ve CFO Rolü
   - Günlük komuta özeti
   - Bugün yapılacak finans işleri
   - Onay bekleyen kritik kayıtlar
   - Banka, kasa, cari, stok ve vergi sorumluluk haritası

2. Finansal Tabloların Analizi
   - Gelir tablosu
   - Bilanço mantığı
   - Nakit akışı
   - Planlanan / tahakkuk / gerçekleşen karşılaştırması

3. Finansal Analiz ve Raporlama
   - Brüt kar, net kar, FAVÖK benzeri işletme göstergeleri
   - Satış / tahsilat oranı
   - Satış / alış oranı
   - Tahsilat / ödeme oranı
   - Gider ciro oranı

4. Mali Analiz Sonuçlarının Görüntülenmesi
   - Renkli karar kartları
   - Tıklanabilir tablo satırları
   - Kategoriye gir, ürüne gir, cari harekete gir
   - "Neden böyle?" açıklama kutuları

5. Stratejik Finansal Yönetim
   - Hedef ve bütçe
   - Sapma analizi
   - En riskli 5 cari
   - En çok nakit tüketen 5 gider
   - En karlı / en zararlı ürün grupları

6. Maliyet Tahmini, Kontrol ve Bütçe
   - Sabit gider kartları
   - Sözleşmeli giderler
   - Öngörülen gelir/gider
   - Kategori bazlı maliyet katsayıları
   - Satılan malın maliyeti ve kar marjı

7. İşletme Sermayesi Analizi
   - Banka toplamı
   - Kasa
   - POS/Moka bekleyen
   - Tahsil edilecek cari
   - Ödenecek tedarikçi
   - Stokta bağlı para

8. Sermaye Yatırımı ve Proje Değerlendirme
   - Yeni ürün grubu karlılık simülasyonu
   - Stok alım kararı
   - Kampanya ve fiyat değişimi etkisi
   - Geri dönüş süresi

9. Sermaye Maliyeti, Birleşme ve Devir Analizi
   - Şimdilik ileri seviye modül
   - Kredi maliyeti
   - Borçlanma karar ekranı
   - Uzun vadeli finansman analizi

10. Finansal Zorluk ve Yeniden Yapılandırma
   - Nakit sıkışma uyarısı
   - Geciken tahsilat
   - Geciken ödeme
   - Kritik stok ve düşük karlılık birleşik risk ekranı

11. Risk Yönetimi
   - Cari risk skoru
   - Banka hareketi mükerrer kontrolü
   - Firma izolasyonu
   - Veri güveni
   - Onaysız kayıt kilidi

12. CFO Rolü: Karar ve Aksiyon
   - AperiON görür
   - AperiON analiz eder
   - AperiON önerir
   - Kullanıcı onaylar
   - AperiON işler
   - AperiON sonucu raporlar

## Ana Ekrana Çevrilecek Görünüm

CFO modu, ana ekranda 8 komuta bölgesinden biri olarak değil; mevcut 8 bölgenin üst aklı olarak çalışacak.

- Banka Canlı: nakit ve banka doğruluğu
- Onay Merkezi: kayıt güvenliği
- Gelir Tablosu: plan/tahakkuk/nakit sonuç
- Satış & Tahsilat: satış ritmi ve tahsilat gücü
- Ürün & Stok: kar marjı, stok ömrü, fiyat kararı
- Cari Risk: müşteri ve tedarikçi riski
- Veri Güveni: kaynak ve senkron sağlığı
- Bildirim Merkezi: sabah/akşam CFO özeti

## İlk Üretim Hedefi

Önce Banka Canlı / Onay Merkezi bitirilecek. Çünkü CFO ekranının güvenilir olması için para hareketinin kaynağı, onayı, BizimHesap kaydı ve sonuç kanıtı net olmalı.

Sonra CFO Modu ana ekranına şu 3 satır eklenecek:

1. Bugün finansal durum
2. Bugün karar bekleyenler
3. Bugün risk ve fırsatlar

## Kabul Kriterleri

- Demo veri gerçek karar gibi gösterilmeyecek.
- Her rakamın kaynağı görünür olacak.
- Her uyarı tıklanınca ilgili kayıt listesi açılacak.
- Onaysız kesin muhasebe kaydı olmayacak.
- Banka, BizimHesap, cari, ürün ve gelir tablosu aynı kayıt diliyle konuşacak.
