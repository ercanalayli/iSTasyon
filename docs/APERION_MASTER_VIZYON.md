# AperiON — Tam Özellik Envanteri (Ana Referans)

> **Kaynak:** Ercan Alaylı'nın ChatGPT geçmişinden derlenip 2026-08-02'de
> Claude'a teslim edilen `AperiON_Claude_Kopyala_Yapistir_Tam_Metin.txt`.
> **Statü:** Bu belge, proje için istenen TÜM özellikleri, kararları ve
> kuralları içeren ürün gereksinimi + proje hafızasıdır — fikir listesi
> değildir. İçerik verbatim (Ercan'ın kendi metni) korunmuştur.
> **Nasıl kullanılır:** Buradaki hiçbir madde, kodda/canlı sistemde
> doğrulanmadan "yapıldı" sayılmaz. Denetim ve güncel durum için
> `docs/VISION_AND_ROADMAP.md` ve `docs/CURRENT_STATUS.md`'ye bakın — bu
> ikisi somut kanıtla (dosya/commit/workflow/canlı veri) güncellenir, bu
> belge ise değişmeyen "istenen" tanımı olarak kalır.
> **Değiştirilmemesi gereken kısım:** Aşağıdaki 50 bölüm Ercan'ın kendi
> talimatıyla birebir korunmuştur; özetlenmemiş, kısaltılmamıştır.

---

CLAUDE İÇİN ANA TALİMAT

Aşağıdaki metin, AperiON iSTasyon projesi için ChatGPT geçmişinden derlenmiş ana özellik envanteri ve proje hafızasıdır.

Bu metni:
- yalnızca fikir listesi olarak değil,
- ürün gereksinimi,
- iş kuralı,
- sistem mimarisi,
- veri yaşam döngüsü,
- güvenlik standardı,
- entegrasyon kapsamı,
- kullanıcı beklentisi
olarak kabul et.

Çalışma kuralları:
1. Metindeki hiçbir özelliği kodda görmeden tamamlanmış sayma.
2. Önce mevcut GitHub depolarını ve canlı sistemi denetle.
3. Her özelliği şu statülerden biriyle sınıflandır:
   - mevcut
   - kısmen mevcut
   - eksik
   - çelişkili
   - doğrulanmamış
4. Her tespiti dosya, commit, workflow, ekran veya canlı veri kanıtıyla destekle.
5. Kullanıcı açık onayı olmadan canlı finans kaydı, dış sisteme yazım, merge veya geri döndürülemez işlem yapma.
6. Öncelik sırası:
   - güvenilir veri omurgası
   - kaynak ve kanıt
   - onay merkezi
   - mükerrer koruma
   - audit log
   - geri doğrulama
   - finansal netlik
   - anomali ve tahmin
   - Üst Akıl
7. Kullanıcıya kısa, net ve kanıtlı özet ver; teknik ayrıntıyı gerektiğinde aç.
8. Çelişki varsa varsayım yapma; açıkça belirt.
9. Bu belgeyi proje boyunca ana referans olarak kullan.
10. AperiON'un resmî kimliği:
    "Ercan Alaylı'nın Dijital Üst Aklı ve İkinci Beyni."

Aşağıdaki envanteri eksiksiz oku ve sonra:
- mevcut durum analizi,
- eksiklerin öncelik sırası,
- uygulanabilir yol haritası,
- ilk güvenli geliştirme paketi
oluştur.

==============================
APERION TAM ÖZELLİK ENVANTERİ
==============================

# AperiON iSTasyon — Claude İçin Tam Özellik Envanteri

**Sahip:** Ercan Alaylı
**Amaç:** ChatGPT geçmişinde AperiON için istenen bütün özellikleri, kararları ve kuralları Claude'a aktarılabilir tek kaynakta toplamak.

## 1. BELGENİN AMACI VE KAPSAM NOTU
- Bu çıktı, erişilebilen ChatGPT proje geçmişi, AperiON master hafıza belgeleri, mevcut konuşma bağlamı ve doğrulanmış GitHub incelemelerinden derlenmiştir.
- Amaç, Claude'a AperiON için istenen bütün özellikleri tek seferde, modül bazında ve mümkün olan en ince ayrıntıyla vermektir.
- Bu belge yalnızca fikir listesi değildir; kararları, kesin kuralları, veri yaşam döngüsünü, ekran davranışlarını, entegrasyonları, güvenlik şartlarını ve ileri seviye AI motorlarını da içerir.
- Erişilemeyen eski sohbetlerin tam kelimesi kelimesine metni bu çıktıda bulunmayabilir. Ancak erişilebilen proje hafızasındaki özellikler ve kararlar olabildiğince eksiksiz konsolide edilmiştir.

## 2. RESMÎ ÜRÜN TANIMI
- Ürün adı: AperiON iSTasyon.
- AperiON, Ercan Alaylı'nın Dijital Üst Aklı ve İkinci Beynidir.
- Sadece muhasebe, ERP, görev uygulaması, aile uygulaması veya finans paneli değildir.
- Ercan'ın şahsi hayatını, ailesini ve ALAYLI Medikal'i tek merkezden gören, anlayan, unutmayan, ilişkilendiren, riskleri önceden gösteren, karar desteği veren ve onaylı aksiyon üreten sistemdir.
- İkinci Beyin görevi: bütün bilgi, belge, karar, geçmiş, ilişki ve bağlamı saklamak ve anında bulmak.
- Üst Akıl görevi: veriyi analiz etmek, önceliklendirmek, tahmin etmek, anomali ve fırsat bulmak, alternatifleri karşılaştırmak ve doğru zamanda doğru kararı önermek.
- AperiON'un temel çalışma sözü: Ercan'ın hayatını ve ALAYLI Medikal'i yalnızca kaydetmek değil; kanıtlarla anlamak, unutmamak, riskleri önceden göstermek, seçenekleri karşılaştırmak ve doğru zamanda onaylanabilir aksiyon üretmek.

## 3. AKTİF KAPSAM VE KİŞİ/ŞİRKET AYRIMI
- Aktif şirket: ALAYLI Medikal.
- Şahsi alan: Ercan Alaylı'nın finansı, varlıkları, borçları, belgeleri, sağlık ve hayat süreçleri.
- Aile çekirdeği: Ercan Alaylı, Çiğdem Alaylı, Ege Alaylı.
- Aile finans yönetimi: Ercan + Çiğdem birlikte.
- Ege için takip kapsamı: okul ödemeleri, kurslar, harçlık, eğitim planı, sağlık, spor, servis/ulaşım, belgeler, pasaport/vize.
- Murat, Erhan, Furkan ve diğer kişiler çekirdek aileye dahil değildir; şirket, personel, hukuki malik, cari veya ilişki kartı olarak tutulabilir.
- Pasif veya ileride açılabilir şirketler/projeler: Woodlet, Elit, Odyoform, Yenicespor ve diğerleri.
- ALKAM Mali İstasyon ayrı projedir; AperiON ile karıştırılmamalıdır.
- Sistem çoklu şirket uyumlu tasarlanmalı, fakat bugün yalnız ALAYLI Medikal aktif olmalıdır.
- Şahsi, aile ve şirket verileri mantıksal olarak ayrılmalı; ayrıca konsolide görünüm üretilmelidir.

## 4. TEMEL TASARIM FELSEFESİ
- Tek doğruluk kaynağı: aynı bilgi farklı yerlerde çelişkili biçimde tutulmamalıdır.
- Kart tabanlı mimari: her kalıcı nesne bir Master Karttır.
- Hareketler kartlara bağlanır; kartların kimliği kalıcıdır.
- Kanıt temelli çalışma: kaynak belge, mesaj, banka hareketi veya kullanıcı onayı olmadan finansal kayıt kesinleşmez.
- Onaylı otonomi: sistem öneri ve taslak aksiyon üretir; yüksek etkili veya dış sisteme yazılan işlemler açık kullanıcı onayı ister.
- Mutlak tarih kullanımı: 'yarın', 'ayın 25'i' yerine '25 Temmuz 2026' gibi açık tarih gösterilir.
- Otomatik ödeme talimatı, ödemenin yapıldığı anlamına gelmez; banka hareketi veya dekontla doğrulanmalıdır.
- Az ama önemli bildirim: kritik olay yoksa bildirim gönderilmez; aynı konu tekrar tekrar bildirilmez.
- Her öneri; gerekçe, veri kaynağı, güven düzeyi, finansal etki ve belirsizlikle birlikte gösterilir.
- Silme yerine ters kayıt, iptal, revizyon ve gerekçe uygulanır.
- Her kural sürümlüdür; hangi kaydın hangi kural sürümüyle üretildiği saklanır.

## 5. MASTER KART SİSTEMİ
- Şirket kartı.
- Kişi kartı.
- Aile üyesi kartı.
- Müşteri kartı.
- Tedarikçi kartı.
- Personel kartı.
- Cari kartı.
- Banka hesabı kartı.
- Kasa kartı.
- Kredi kartı kartı.
- KMH / ek hesap kartı.
- Kredi kartı ekstresi kartı.
- Banka kredisi kartı.
- Kredi taksit kartı.
- Çek ve senet kartı.
- POS kartı.
- Moka kartı.
- Abonelik kartı.
- Sabit gider kartı.
- Değişken gider kartı.
- Vergi ve SGK yükümlülük kartı.
- Fatura kartı.
- Belge kartı.
- Belge sürümü kartı.
- Araç/motosiklet kartı.
- Gayrimenkul kartı.
- Poliçe kartı.
- Sözleşme kartı.
- Görev ve kritik iş kartı.
- Hedef ve fon kartı.
- Ürün ve stok kartı.
- Cihaz/demirbaş kartı.
- Her kartta sahiplik, şirket/şahsi kapsam, durum, kaynak, belge ilişkisi, güncel değer ve audit izi bulunmalıdır.

## 6. HUKUKİ MALİK VE EKONOMİK SAHİPLİK
- Varlıklarda hukuki malik ile ekonomik/fiilî sahip ayrı alanlarda tutulmalıdır.
- Örnek: Lütfiye tarla tapuda Murat Alaylı adına, fakat ekonomik olarak Ercan Alaylı'ya aittir.
- Bilanço ekonomik sahipliğe göre; belge ve hukuki kayıt tapudaki malik bilgisine göre gösterilmelidir.
- Ortak sahiplik, aile sahipliği, şirket sahipliği ve emanet sahiplik desteklenmelidir.

## 7. KAYIT YAŞAM DÖNGÜSÜ
- 1) Kaynak veri alındı.
- 2) Kaynak bütünlüğü ve kimliği doğrulandı.
- 3) Belge/mesaj sınıflandırıldı.
- 4) Veri çıkarıldı.
- 5) Ön kontrol yapıldı.
- 6) Mükerrer kontrolü yapıldı.
- 7) Hesap/kart/cari/şirket eşleştirildi.
- 8) Aday kayıt oluşturuldu.
- 9) Güven puanı ve risk sınıfı hesaplandı.
- 10) Onay Merkezi'ne gönderildi.
- 11) Kullanıcı onayladı, düzeltti veya reddetti.
- 12) Hedef sisteme/deftere/BizimHesap'a yazıldı.
- 13) Hedef sistemden geri okundu.
- 14) Mutabakat yapıldı.
- 15) İşlem doğrulandı.
- 16) Audit log ve rapor üretildi.
- 17) Hata varsa retry kuyruğu, ters kayıt veya manuel inceleme açıldı.

## 8. ONAY MERKEZİ
- Onayla / Reddet / Düzelt seçenekleri.
- Kaynak e-posta veya mesaj bağlantısı.
- Kaynak gönderen, geliş tarihi, belge tarihi ve dönem.
- Belge önizlemesi.
- İşlem özeti.
- Tutar, para birimi ve yön.
- Önerilen hesap, kart, cari ve kategori.
- Şirket/şahsi kapsam.
- Güven puanı.
- Risk sınıfı.
- Mükerrer kontrol sonucu.
- Benzer geçmiş kayıtlar.
- Sınıflandırma gerekçeleri.
- Kullanıcı düzeltmesi kalıcı kural veya override olarak kaydedilebilmeli.
- AI güven puanı kullanıcı onayının yerine geçemez.
- Onay sonrası hedef sisteme yazım ve geri doğrulama zorunludur.
- Telegram onay merkezi ile web onay merkezi aynı kayıtları göstermelidir.

## 9. DENETİM İZİ VE ULUSLARARASI GÜVENİLİRLİK
- Kim, ne zaman, hangi kanıta dayanarak, hangi alanı değiştirdi sorusu cevaplanmalıdır.
- Değişmez audit event kimliği.
- Önceki değer / yeni değer.
- Kaynak ID ve correlation ID.
- Kural sürümü.
- Onaylayan kullanıcı.
- İşlem zamanı ve efektif tarih ayrı tutulmalıdır.
- İdempotency ve duplicate key.
- Dört göz prensibi ve görevlerin ayrılığı desteklenmelidir.
- Görüntüleme, öneri, onay, kayıt, yönetim ve denetim rolleri ayrılmalıdır.
- Hata kuyruğu, retry, dead-letter ve geri alma mekanizması.
- Yedekleme, felaket kurtarma, şifreleme ve gözlemlenebilirlik.
- Public GitHub deposunda kişisel belge, banka verisi, token, şifre veya secret bulunmamalıdır.

## 10. TEK MERKEZ: TODAY'S CRITICAL PAYMENTS AND DEADLINES
- Kritik ödemeler, ekstreler, fatura bildirimleri, son tarihler ve görevler ayrı yerlerde dağılmamalıdır.
- Tarih sırasına göre tek listede gösterilmelidir.
- Her kartta: başlık, mutlak son tarih, tutar, durum, otomatik ödeme, ödeme hesabı, şirket/şahsi kapsam, kaynak ve kanıt.
- Durumlar: yeni, belge bekleniyor, onay bekliyor, ödeme bekliyor, ödendi, bankadan doğrulandı, gecikti, iptal.
- Kaynak tarihi eskiyse 'geçmişten kalan' etiketi.
- Aynı bildirim ikinci kez görev oluşturmamalıdır.
- Kaynak bulunamıyorsa kritik görev üretilmemeli; 'kanıtsız' olarak incelemeye alınmalıdır.
- Kartta önerilen aksiyon: öde, nakit ayır, kontrol et, belge iste, cari doğrula, kayda işle.
- Tutar bilinmese bile ödeme kartı vadesiyle listelenmelidir.
- Bu ayın listesinde 'her ayın 25'i' değil, '25 Temmuz 2026' gibi gerçek tarih gösterilmelidir.
- Otomatik ödeme başarısızlığı veya ek hesaptan çekilme riski izlenmelidir.

## 11. SABİT VE DEĞİŞKEN GİDER YÖNETİMİ
- Sabit giderler kart olarak oluşturulmalı ve dönemsel olarak otomatik açılmalıdır.
- Değişken giderler BizimHesap'tan otomatik çekilmelidir.
- Değişken giderler için kullanıcıya tek tek soru sorulmamalıdır.
- Yalnız açıklaması belirsiz, şahsi/şirket ayrımı net olmayan, mükerrer, olağan dışı veya yanlış kategorili giderler sorulmalıdır.
- Şirket sabit giderleri: internet, GSM, sabit telefon, işyeri kira, aidat, elektrik, su, doğalgaz, personel maaşı, SGK, vergi, kredi taksiti, yazılım abonelikleri.
- Şahsi sabit giderler: ev aidatı, elektrik, su, doğalgaz, internet, kredi kartları, krediler ve aile yükümlülükleri.
- Yemek makbuzları haftalık takip.
- İşyeri aidatları kart mantığında takip.
- Yakıt ve aidat gibi giderlerin doğru sınıflandırılması.
- Maaş kartları: Çiğdem 75.000 TL, Ercan 75.000 TL, Furkan Batkı 45.000 TL bilgileri geçmişte verilmiştir; güncellik ayrıca doğrulanmalıdır.
- Maaş son ödeme günü: her ayın 5'i.
- Furkan banka üzerinden, diğer ödeme şekilleri değişken olabilir.
- İşyeri kiraları en geç ayın son günü veya ilgili karttaki kesin tarihe göre takip edilmelidir; geçmiş konuşmalardaki farklı tarihler kaynakla doğrulanmalıdır.

## 12. GMAIL VE E-POSTA MERKEZİ
- Ana kaynak hesap: alaylimedikal@gmail.com.
- Gerekirse banka e-postaları ercanalayli@gmail.com hesabına kurallı yönlendirilebilir.
- Gmail OAuth güvenli biçimde GitHub Actions secret üzerinden yönetilmelidir.
- Refresh token helper akışı: start, izin URL'si, finish, code, refresh token.
- Banka e-postaları, muhasebe belgeleri, vergi/SGK belgeleri, faturalar ve ekstreler otomatik aranmalıdır.
- Her e-posta için gönderen, konu, geliş zamanı, şirket, belge türü, banka, dönem, ek adı ve kaynak linki saklanmalıdır.
- E-posta sadece bildirim mi, gerçek belge mi, finansal hareket mi ayrıştırılmalıdır.
- Kredi kartı ekstresi ile vadesiz hesap ekstresi farklı parser'dan geçmelidir.
- Kampanya, halka arz, duyuru ve reklam mailleri finansal hareket olarak sınıflandırılmamalıdır.
- Kaynak banka adı ile açıklamadaki banka uyuşmazsa kayıt incelemeye alınmalıdır.
- Aynı e-posta veya ek hash üzerinden ikinci kez işlenmemelidir.
- Gelen belgeler otomatik arşivlenmeli ve ilgili karta bağlanmalıdır.

## 13. BANKA EKSTRE VE HAREKET MERKEZİ
- Banka bazlı parser yapısı.
- Kredi kartı ekstresi parser'ı.
- Vadesiz hesap ekstresi parser'ı.
- Kredi ödeme planı parser'ı.
- Dekont parser'ı.
- POS raporu parser'ı.
- Moka raporu parser'ı.
- İşlem no, referans no, tarih, saat, açıklama, borç, alacak, bakiye, banka, hesap/kart bilgisi çıkarılmalıdır.
- Finansal hareket kanıt kapısı: gerçek işlem satırı, referans, borç/alacak, bakiye değişimi veya açık FAST/EFT/POS dili olmadan hareket adayı oluşmamalıdır.
- Banka adı uyuşmazlığı kontrolü.
- Pazarlama/duyuru engeli.
- Mükerrer anahtar.
- Gelen para kesin fakat cari belirsizse 'Hesaba Para Girişi - eşleştirme bekliyor' olarak tutulmalıdır.
- Cari bilinmeden yanlış tahsilat kaydı yapılmamalıdır.
- Banka komisyonu, BSMV ve masraflar ayrı gider olarak sınıflandırılmalıdır.
- Kredi kartı borç ödemesi bankadan karta virman olarak işlenmelidir.
- Şirket bankaları arası virman çift gelir/gider üretmemelidir.
- KMH ana para kapama, POS banka aktarımı ve Moka aktarımı transfer olarak işlenmelidir.

## 14. BİZİMHESAP ENTEGRASYONU
- BizimHesap değişken gider ve operasyon kayıtlarının ana kaynaklarından biridir.
- Banka hareketleri önce AperiON aday kaydına, sonra kullanıcı onayıyla BizimHesap kuyruğuna aktarılmalıdır.
- Kuyruk durumları: aday, onay bekliyor, ready_for_bizimhesap, gönderildi, geri doğrulandı, hata.
- Kullanıcı açık onayı olmadan canlı kayıt yapılmamalıdır.
- Dry-run, plan ve canlı kayıt birbirinden ayrılmalıdır.
- Hedef hesaba yazıldıktan sonra BizimHesap'tan geri okuma yapılmalıdır.
- Gider kartları BizimHesap masraf ve fatura detaylarından üretilebilmelidir.
- Fatura detayları gider kartlarına bağlanmalıdır.
- Banka, kasa, cari, müşteri ve tedarikçi eşleştirmeleri desteklenmelidir.
- Aynı işlem banka ve BizimHesap tarafında iki kez sayılmamalıdır.

## 15. POS VE MOKA
- POS tahsilatları bankaya geçtiğinde yeni gelir olarak ikinci kez sayılmamalıdır.
- Moka United kredi kartı tahsilatlarının bankaya taksit taksit geçişi izlenmelidir.
- Moka hareketleri, banka hareketleri, bankaya yatacaklar ve günlük toplam ayrı raporlanmalıdır.
- Standart Moka rapor sayfaları: OZET, Moka_Hareketleri, Banka_Hareketleri, Bankaya_Yatacaklar, Gunluk_Toplam.
- Moka paneli gelecek bakiye ve toplamları göstermelidir.
- Moka raporundaki tutarlar banka ile otomatik eşleştirilmelidir.
- Taksit, komisyon, eksik/gecikmiş banka geçişi ve mükerrer tahsilat kontrolü.
- Moka transferi şirket içi transfer olarak sınıflandırılmalıdır.
- Sistem rapordaki hatayı da kontrol etmeli; raporu körü körüne doğru kabul etmemelidir.

## 16. VERGİ, SGK, BEYANNAME VE TAHAKKUK MERKEZİ
- KDV beyannamesi ve tahakkuku.
- Muhtasar ve Prim Hizmet Beyannamesi.
- SGK tahakkukları.
- Geçici Vergi.
- Kurumlar Vergisi.
- GEKAP.
- Damga Vergisi.
- 5035 ve diğer tahakkuklar.
- Her ay 'Vergi ve SGK Belgeleri Bekleniyor' ana görevi açılmalıdır.
- Belge gelmeden işlem kapanmamalıdır.
- Mali müşavirden veya tanımlı kaynaktan e-posta beklenmelidir.
- Eksik belge varsa sadece eksik olan sorulmalıdır.
- Belge geldiğinde şirket, VKN, dönem, vergi türü, tahakkuk tutarı, son ödeme tarihi ve tahakkuk numarası çıkarılmalıdır.
- Beyanname geldi, tahakkuk gelmedi veya ödeme yapılmadıysa görev açık kalmalıdır.
- Durum zinciri: belge bekleniyor, eksik belge var, belgeler tamam, ön kontrol, ödeme bekliyor, kısmen ödendi, ödemeler tamam, bankadan doğrulandı, tamamlandı.
- 7 gün, 3 gün, 1 gün kala ve vade geçince alarm.
- Her ay bütün vergi türleri körü körüne beklenmemeli; ilgili dönem kuralları ve geçmiş beyanlar kullanılmalıdır.
- Ödeme banka hareketi veya dekontla doğrulanmadan kapatılmamalıdır.
- Mevzuat ve yıllık eşik değişiklikleri izlenmelidir.

## 17. MEVZUAT VE YASAL YÜKÜMLÜLÜK TAKİBİ
- Vergi, SGK, KDV tevkifatı, fatura, nakliye ve şirket yükümlülüklerindeki resmî değişiklikleri izleme.
- Araç/motosiklet trafik sigortası, kasko, MTV, muayene, egzoz, HGS, bakım ve geri çağırma yükümlülükleri.
- Gayrimenkul için DASK, konut sigortası, emlak vergisi, çevre temizlik vergisi, aidat, kira, tapu ve belediye yükümlülükleri.
- İşyeri için ruhsat, yangın sigortası, yangın tüpü, acil çıkış, klima ve periyodik kontroller.
- Mevzuat değiştiğinde yalnız kullanıcıyı etkileyen sonuç bildirilmelidir.
- Yükümlülük değişikliği ilgili varlık veya şirket kartına bağlanmalıdır.
- Türkiye KDV kısmi tevkifat eşikleri ve nakliye faturası kuralları özellikle izlenmelidir.
- Kullanıcı kuralı: 2026 kısmi tevkifat alt sınırı KDV dahil 12.000 TL; nakliyede 2/10, eşik aşılırsa uygulanır.

## 18. BELGE ARŞİVİ VE İKİNCİ BEYİN
- Ruhsat, tapu, poliçe, fatura, tahakkuk, dekont, ekstre, sözleşme, fotoğraf, e-posta eki, WhatsApp belgesi, Telegram belgesi, ses, not, Excel ve Word arşivlenmelidir.
- Belge ilgili kişi, şirket, araç, gayrimenkul, kredi, ödeme veya göreve bağlanmalıdır.
- Belge hash'i, sürümü, geliş zamanı, belge tarihi, kaynak ve saklama URI'si tutulmalıdır.
- Eski sürümler silinmemelidir.
- Aynı belge tekrar yüklenirse mükerrer kayıt açılmamalıdır.
- Doğal dil arama: 'Motosikletimin ruhsatını göster', 'Temmuz VakıfBank ekstrelerini getir', 'Lütfiye tarla tapusunu aç'.
- En güncel belge doğrudan açılmalı; eski sürümler ayrıca görülebilmelidir.
- Kim yükledi, kim görüntüledi, hangi karta bağlandı audit log'da tutulmalıdır.
- Hassas belgeler public GitHub'da tutulmamalıdır.
- Belge geldi diye süreç kapanmamalı; ödeme veya yükümlülük ayrıca doğrulanmalıdır.

## 19. ARAÇ, MOTOSİKLET VE GAYRİMENKUL VARLIK YÖNETİMİ
- Araç ve motosiklet için ruhsat, plaka, marka/model, yıl, şasi/motor, kullanım türü, sahibi, ilk tescil, muayene, trafik sigortası, kasko, MTV, bakım, lastik, akü, ceza ve HGS.
- TVS Jupiter 125 motosiklet ve bir otomobil varlık envanterinde yer almalıdır; otomobil detayları belgeyle tamamlanmalıdır.
- Trafik poliçelerinin prim ve taksitleri ödeme takvimine bağlanmalıdır.
- Gayrimenkuller: Çiğdem adına Alanyurt mesken; Ercan adına Süleymaniye mesken; Murat adına tapulu ama ekonomik olarak Ercan'a ait Lütfiye tarla.
- Her gayrimenkulde tapu, DASK, sigorta, emlak vergisi, aidat, kira, abonelik, bakım ve güncel değer.
- Başka araç ve gayrimenkul olmadığı bilgisi geçmişte verilmiştir; güncellik doğrulanmalıdır.

## 20. VARLIK DEĞERLEME, BİLANÇO VE NET DEĞER
- Her varlığın alış değeri, güncel piyasa değeri, değerleme tarihi, kaynak ve güven skoru tutulmalıdır.
- Araçlar aylık piyasa ortalamasıyla yeniden değerlenmelidir.
- Gayrimenkuller aylık veya üç aylık piyasa ortalaması, ilan karşılaştırması ve gerektiğinde ekspertizle değerlenmelidir.
- Banka/nakit anlık; döviz/altın/yatırım piyasa verisiyle; stok maliyet ve satış değeriyle güncellenmelidir.
- Şahsi bilanço: banka, nakit, yatırım, araç, ev, arsa, alacak, borç, kredi kartı, kredi ve vergiler.
- Şirket bilançosu: kasa, banka, POS, Moka, cari alacak, stok, demirbaş, araç, gayrimenkul; kredi, kart, cari borç, vergi, SGK, personel, çek/senet.
- Aile konsolide bilançosu.
- Toplam varlık, toplam borç, net servet, öz sermaye, likidite, 30 günlük ödeme yükü ve serbest nakit.
- Aylık değer değişimleri tarihsel olarak saklanmalıdır.
- Net değer; şahsi, şirket ve aile/konsolide olarak ayrı gösterilmelidir.

## 21. FİNANSAL NETLİK VE CEO COCKPIT
- Ana giriş ekranı AperiON'un konuştuğu merkez olmalıdır.
- İlk bakışta 8 sayı: bugünkü satış, bugünkü net kâr, kullanılabilir nakit, 30 günlük beklenen nakit, 30 günlük ödeme yükü, toplam borç, net değer, kritik risk sayısı.
- Gelir: gün/hafta/ay/yıl, tahsil edilen/edilmeyen, kaynak dağılımı ve bağımlılık riski.
- Gider: sabit/değişken, şahsi/şirket, bütçe sapması ve olağan dışı gider.
- Kâr: brüt/net, ürün, kategori, müşteri, kanal, marj ve kâr kaçağı.
- Nakit: banka, kasa, blokeli tutar, POS/Moka bekleyen, 7/30/90 günlük projeksiyon.
- Borç: kart, KMH, kredi, cari, çek, vergi/SGK, faiz ve vade.
- Tasarruf: acil fon, şirket rezervi, hedef fonlar.
- Net değer: şahsi, şirket, aile, likit net değer.
- Abonelik ve komisyonlar: banka, POS, Moka, kart aidatı, yazılım ve yenilemeler.
- Her rakam tıklanınca kaynağına kadar drill-down yapılmalıdır.
- Dönem karşılaştırmaları: dün, geçen hafta aynı gün, geçen ay aynı gün, geçen yıl aynı dönem, son 3 ay ortalaması, bütçe ve AperiON tahmini.
- 15 dakikalık haftalık finans kontrolü.
- Kritik olay yoksa kullanıcı panoya takıntılı hale getirilmemelidir.

## 22. SATIŞ, KÂR VE OPERASYON ANALİTİĞİ
- Bugün ne kadar satış oldu?
- Bugün ne kadar kâr edildi?
- Dün, geçen hafta aynı gün, geçen ay aynı gün ve geçen yıl aynı gün ile karşılaştırma.
- Günlük brüt ve net kâr.
- Kâr marjı ve kâr oranı.
- Ürün, kategori, müşteri, kanal ve bölge bazında kârlılık.
- Satış artışının veya düşüşünün nedenini açıklama.
- Hangi ürün yükseliyor/düşüyor?
- Hangi kategori zarar ediyor?
- Hangi müşteri alışkanlığını değiştirdi?
- Hangi tedarikçide maliyet arttı?
- Hangi gider olağan dışı?
- Geçmişe göre oran ve trend.
- Tahmin ve sezon etkisi.
- Anomali tespiti ve neden analizi.

## 23. ANOMALİ, RİSK VE DENETÇİ MOTORU
- Satışta olağan dışı düşüş/artış.
- Kâr marjı bozulması.
- POS tahsilatının bankaya geçmemesi.
- Moka transferinin eksik veya gecikmiş olması.
- Müşterinin ilk kez geç ödemesi.
- Faturanın geçmiş ortalamaya göre çok yüksek olması.
- Elektrik/yakıt/kargo giderinde anormal artış.
- Aynı belge veya ödemenin iki kez işlenmesi.
- Kredi kartında alışılmış dışı harcama.
- Beklenmeyen banka çıkışı.
- Kasa ile banka veya BizimHesap uyuşmazlığı.
- Kaynak banka ile açıklamadaki banka uyuşmazlığı.
- Kampanya/duyuru mailinin finansal hareket gibi algılanması.
- Risk puanı ve şirket sağlık skoru.
- AI Auditor: 'Bu kayıt gerçekten doğru mu?' sorusunu sürekli sormalıdır.

## 24. NAKİT AKIŞI VE TAHMİN MOTORU
- Bugünkü banka ve kasa durumu.
- 7, 15, 30, 45 ve 90 günlük nakit projeksiyonu.
- Beklenen tahsilatlar, POS/Moka geçişleri ve planlı ödemeler.
- Maaş, kira, vergi, SGK, kart ve kredi yüklerinin tarihsel etkisi.
- Nakit açığı oluşmadan önce uyarı.
- Hangi ödemenin ertelenebilir, hangisinin kritik olduğunu önerme.
- Hangi hesaptan ödeme yapılması gerektiğini sonradan optimize etme.
- Ek hesap kullanım riskini gösterme.
- Otomatik ödeme günü öncesi hesapta yeterli bakiye kontrolü.

## 25. BORÇ TASFİYE VE OPTİMİZASYON MOTORU
- Kar topu stratejisi.
- Çığ stratejisi.
- Hibrit strateji.
- Nakit akışı optimizasyonu.
- Toplam faiz minimizasyonu.
- Risk minimizasyonu.
- AI optimum plan.
- Her borç için bakiye, faiz, efektif maliyet, minimum ödeme, vade, erken kapama cezası, teminat ve aylık taksit.
- Her strateji için ödeme sırası, aylık ödeme, toplam faiz, borçsuz tarih, avantaj/dezavantaj.
- Ekstra para geldiğinde planı yeniden hesaplama.
- Yapılandırma, faiz değişimi, erken tahsilat ve kredi kapama simülasyonları.
- Fırsat maliyeti: borç kapatmak mı, stok almak mı, yatırım mı, nakitte tutmak mı?

## 26. GİDER KAÇAĞI VE KÂR KAÇAĞI DEDEKTÖRÜ
- Unutulan abonelikler.
- Yemek teslimatı.
- Düşüncesiz/tekrarlayan alımlar.
- Aşırı fiyatlı faturalar.
- Banka ücretleri ve kart aidatları.
- Sigorta primleri.
- Enerji maliyetleri.
- Ulaşım ve yakıt.
- Eğlence ve sosyal gider.
- Küçük yinelenen giderler.
- POS ve Moka komisyonları.
- Fazla stok ve bağlı sermaye.
- Geç tahsilatın finansman maliyeti.
- Satış fiyatının piyasanın altında kalması.
- Kaçırılan erken ödeme iskontoları.
- Her kaçak için potansiyel tasarruf, uygulama zorluğu, yaşam kalitesi etkisi ve öncelik.
- 30 günlük maliyet düşürme planı; hayatı finansal hapishaneye çevirmeden.

## 27. GELİR DAYANIKLILIĞI VE YENİ GELİR MOTORU
- Mevcut gelir kaynaklarını analiz etme.
- Tek gelir kaynağına bağımlılığı ölçme.
- 7 potansiyel gelir akışı tasarlama.
- ALAYLI Medikal büyümesi.
- AperiON SaaS/abonelik ürünü.
- AI otomasyon ve dijital dönüşüm danışmanlığı.
- Dijital eğitim ve rehberler.
- Temettü/yatırım gelirleri.
- Kira veya mevcut varlıkların verimli kullanımı.
- Lisanslama, ortaklık ve sektör çözümleri.
- Her gelir akışı için başlangıç zorluğu, maliyet, ilk gelir süresi, risk ve ölçeklenebilirlik.
- 12 aylık gelir çeşitlendirme yol haritası.

## 28. YAN İŞ / İŞ FIRSATI DOĞRULAMA MOTORU
- Fikirleri başlamanın kolaylığı, ilk gelir süresi, talep, rekabet, marj, ölçeklenebilirlik, gerekli beceri ve riskle puanlama.
- Mevcut ALAYLI Medikal, AperiON ve finans/muhasebe yetkinlikleriyle sinerji.
- Ercan'a bağımlılık seviyesi.
- 30 günlük doğrulama deneyi.
- Hedef müşteri görüşmeleri.
- Basit teklif paketi ve demo.
- İlk ücretli pilot.
- Devam et / küçük pilot / koşullu beklet / reddet kararı.

## 29. OTOMATİK TASARRUF VE FON MOTORU
- Mini acil durum fonu.
- 3-6 aylık şahsi acil durum fonu.
- Şirket için 2-3 aylık sabit gider tamponu.
- Borç koruma tamponu.
- Ege eğitim fonu.
- Seyahat, araç, gayrimenkul, bakım ve yatırım hedef fonları.
- Gelir geldiği anda otomatik bölüşüm.
- Şirket cirosundan haftalık süpürme.
- Beklenmedik gelir için otomatik dağıtım.
- Nakit durumuna göre dinamik tasarruf oranı.
- Fonların günlük harcama hesabından ayrı tutulması.
- Fon bozma gerekçesi ve yeniden doldurma planı.

## 30. UTANÇSIZ BÜTÇE VE YAŞAM DENGESİ
- 50/30/20 kuralını sabit değil, kişiye ve nakit akışına göre dinamik kullanma.
- Şirket, şahsi, aile ve gelecek kategorileri.
- Hayat kalitesini koruyan bütçe.
- Suçluluk duymadan eğlence bütçesi.
- Sosyal plan motoru.
- Pahalı planları kibarca reddetme senaryoları.
- Tatil, restoran, doğum günü, grup alışverişi ve son dakika planları için gerçekçi metinler.
- Para, zaman ve enerji birlikte optimize edilmelidir.
- Yaşam Dengesi Skoru.

## 31. DAVRANIŞSAL ZEKÂ VE DÜRTÜSEL HARCAMA KORUMASI
- Stresli günlerde artan harcamayı öğrenme.
- Gece saatlerinde online alışveriş eğilimi.
- Büyük gelir sonrası ödül harcamaları.
- Zorunlu olmayan alışveriş için bekleme süresi.
- Esnek haftalık harcama limiti.
- İstek listesi sistemi.
- Abonelik inceleme süreci.
- Online alışveriş kuralı.
- Duygusal harcama kuralı.
- Satın alma karar şablonu: ihtiyaç, nakit etkisi, alternatif maliyet, yaşam kalitesi ve erteleme.
- Sistem yasaklamamalı; bilinçli karar için sürtünme oluşturmalıdır.
- Davranış motoru sadece harcamayı değil; satın alma, yatırım, borçlanma, personel, müşteri ve zaman kullanımını öğrenmelidir.

## 32. FİNANSAL ZİHNİYET VE 21 GÜNLÜK SIFIRLAMA
- Boş motivasyon cümleleri yerine veri ve davranış temelli koçluk.
- Günlük kısa yansıma.
- Günde bir küçük finansal eylem.
- Pekiştirilecek alışkanlık.
- Her gün bilinçli bir harcama kararı.
- Minnettarlık veya finansal netlik egzersizi.
- İlerleme metriği.
- 1-7. gün gerçeği görme.
- 8-14. gün sürtünme ve sistem kurma.
- 15-21. gün karar kalitesini yükseltme.
- Plansız karar sayısı ve kanıta dayalı karar oranı izlenmelidir.

## 33. MÜŞTERİ, TEDARİKÇİ VE CARİ ANALİZİ
- En iyi müşteri.
- Kaybedilen müşteri.
- Riskli müşteri.
- En hızlı büyüyen ve en çok azalan müşteri.
- Tahsilat riski.
- Ortalama ödeme günü.
- Müşteri kârlılığı.
- Cari eşleştirme güven puanı.
- Tedarikçi maliyet değişimi.
- Alternatif tedarikçi ve tasarruf fırsatı.
- İlgili kişi/cari kullanıcı doğrulaması.
- Cari bilinmiyorsa kesin kayıt yerine bekletme.

## 34. STOK VE ÜRÜN ZEKÂSI
- Bitecek ürünler.
- Fazla stok.
- Hareketsiz stok.
- En hızlı dönen ürün.
- En çok ve en az kâr bırakan ürün.
- FIFO maliyet.
- Stok sermaye maliyeti.
- Satış fiyatı ve piyasa karşılaştırması.
- Sipariş ve sevk kapanış kuralları.
- Hasta bezi dashboard kuralları: kâr KDV hariç, net kâr = satış KDV hariç - FIFO maliyet - nakliye.
- Kâr marjı = kâr / satış KDV hariç.
- Kâr oranı = kâr / FIFO maliyet.
- Fatura + sevk tarihi olmadan sipariş kapanmaz.
- Ürün bazında alış tarihi, alış fatura no, fark fatura no, maliyet, iskonto dahil, kâr ve marj izlenmelidir.

## 35. NAKLİYE / MURAT TİCARET MODÜLÜ
- Proforma ve fatura hazırlama.
- Aynı sevkiyatları tek satırda birleştirme.
- Aynı ay/dönem, aynı çıkış, varış, palet aralığı ve birim navlun eşleşmesi.
- İkinci sayfada özet.
- KDV tevkifat alt sınırı ve 2/10 nakliye tevkifatı.
- Yıllık eşik değişikliklerini izleme.
- Fatura/proforma kontrolü.
- Vade, fiyat artışı ve sözleşme değişikliklerinin takibi.

## 36. İLETİŞİM MERKEZİ: TELEGRAM, WHATSAPP, E-POSTA
- Telegram ana bildirim ve onay kanalı.
- Bildirimler 'AperiON' adıyla telefon ve saate gelmelidir.
- Telegram onay butonları.
- Günlük banka karar özeti.
- Sabah finans özeti.
- Kritik risk alarmı.
- Ödeme hatırlatmaları.
- Aynı alarmın tekrarını engelleme.
- WhatsApp Business ana hat.
- WhatsApp mesaj ve belge sınıflandırması.
- WhatsApp Helper veya Cloud API ile güvenilir bağlantı.
- Bot canlılık/health kontrolü kullanıcıya bırakılmamalıdır.
- Kullanıcı her seferinde bot çalışıyor mu diye kontrol etmemelidir.
- Sistem kendi health check, retry ve alarm mekanizmasına sahip olmalıdır.
- Telefon ve Apple Watch bildirimleri desteklenmelidir.

## 37. GOOGLE DRIVE VE DOSYA DEĞİŞİKLİĞİ TAKİBİ
- Belirlenen Google Drive dosyalarına bağlı kalma.
- Dosyayı düzenli aralıklarla kontrol etme.
- Dosyada eklendi, silindi, ödendi, değişti gibi olayları tespit etme.
- Değişiklikleri AperiON hafızasına işleme.
- Değişiklik olduğunda kullanıcıya bildirme.
- Dosyanın kaynak sürümünü ve değişiklik geçmişini saklama.
- Drive, GitHub ve yerel dosyalar için tek belge kimliği yaklaşımı.

## 38. PROJE HAFIZASI VE BİLGİ GRAFI
- Sohbetleri tek dev dokümana yapıştırmak yerine bilgi kartlarına dönüştürme.
- Her fikir bir Knowledge Card.
- Kart alanları: ID, başlık, kaynak, tarih, durum, etiketler, ilişkiler, karar, kanıt.
- Etiketler: AperiON, Foro, Hasta Bezi, Dashboard, Gmail, Banka, İngilizce, Moka, ALAYLI, Codex vb.
- Kartları kopyalayarak değil ilişkilendirerek birleştirme.
- Sohbetler -> Bilgi Kartları -> Bilgi Grafiği -> AperiON Master.
- Yapılanlar / İstenenler / Yapılacaklar / Fikirler görünümü.
- Her sohbet sonunda handoff ve master state güncellemesi.
- GitHub resmî proje hafızası ve tek doğruluk kaynağı olmalıdır.

## 39. İNGİLİZCE ÖĞRENME ENTEGRASYONU
- AperiON, kullanıcı için İngilizce öğrenme üst aklı olarak da çalışmalıdır.
- Bilinmeyen kelimeleri otomatik tespit edip kelime hazinesine ekleme.
- Approval flow, review, rhythm gibi bilinmeyen terimlerin kaydedilmesi.
- Kelime kartları ve tekrar sistemi.
- Yazılı ve sözlü çalışma.
- İngilizceyi yavaş, Türkçeyi hızlı seslendirme.
- Kısa cümleler ve B2 hedefi.
- Türkçe yazışmanın altında görsel olarak ayrılmış İngilizce karşılık.
- AperiON'dan gün içinde kelime öğrenme bildirimleri.
- Kelimeyi bilmediğini kullanıcının açıkça söylemesini beklemeden konuşma davranışından anlama.
- İngilizce çalışma modu açık/kapalı ayrımı; normal konuşmada gereksiz çeviri yapmama.

## 40. AİLE VE EGE ÜST AKIL KAPSAMI
- Aile üyeleri Ercan, Çiğdem, Ege.
- Aile finansı Ercan ve Çiğdem tarafından ortak yönetilir.
- Ege için okul, kurs, harçlık, eğitim planı, sağlık, spor, servis/ulaşım, belge, pasaport ve vize.
- Aile belgeleri ve ödemeleri kişi kartlarına bağlanmalıdır.
- Rol tabanlı erişim: Ercan tam yetki, Çiğdem aile/şahsi finans ve belgeler, Ege yaşına uygun sınırlı görünüm.
- Aile finansı ile şirket finansı karıştırılmamalıdır.

## 41. SAĞLIK VE HAYAT ASİSTANI
- Şahsi sağlık belgeleri, tetkikler, ilaçlar, doktor randevuları ve önemli sağlık notları için ayrı kartlar.
- Kalp krizi geçmişi ve yüksek trigliserid gibi kritik sağlık bilgileri yalnız güvenli ve yetkili alanda tutulmalıdır.
- Sağlık hatırlatmaları ve belge arşivi.
- Finansal kararlarla sağlık ve yaşam kalitesi etkisi birlikte değerlendirilebilmelidir.

## 42. SOSYAL MEDYA VE PAZARLAMA OPERASYONU
- ALAYLI Medikal için günlük WhatsApp Durum ve Instagram post/story üretimi.
- Temsilî yapay görsel yerine kullanıcı tarafından sağlanan gerçek mağaza, ürün ve hizmet fotoğrafları.
- Fotoğraf üzerine profesyonel tasarım, logo, metin, iletişim, konum ve CTA.
- Gerçek tabela renk/fontlarının korunması.
- Sosyal medya arşivi ve onay sistemi.
- Ürün ve bölge bazlı kampanya önerileri.

## 43. ÜST AKIL AI ROLLERİ
- AI CFO: nakit, borç, yatırım, sermaye ve finansal kararlar.
- AI COO: günlük operasyon öncelikleri ve personel iş planı.
- AI Auditor: kayıt doğruluğu, mutabakat ve anomali.
- AI Risk Engine: finans, mevzuat, belge, tahsilat ve operasyon riskleri.
- AI Opportunity Engine: tasarruf, yeni gelir, fiyat, tedarikçi ve yatırım fırsatları.
- AI Strategist: büyüme, ürün, müşteri, bölge ve kanal stratejisi.
- AI Executive Assistant: her sabah 'Bugün bilmen gerekenler'.
- AI Behavior Engine: kullanıcı alışkanlıkları ve karar kalitesi.
- AI Document Intelligence: belge sınıflandırma, veri çıkarma ve ilişkilendirme.
- AI Learning Coach: İngilizce ve kişisel öğrenme.

## 44. GÜNLÜK YÖNETİCİ ÖZETİ
- Bugün ne kritik?
- Bugün ne kadar satış yapıldı?
- Bugün ne kadar kâr edildi?
- Bugün ne kadar tahsilat ve ödeme oldu?
- Nakit durumu.
- Önümüzdeki 7/30 gün riski.
- Geciken tahsilat ve ödeme.
- Eksik belge.
- Bitecek poliçe.
- Kritik stok.
- Anomali.
- Onay bekleyen işlem.
- Her madde kaynak ve önerilen aksiyonla birlikte sunulmalıdır.
- Kullanıcı rapor aramamalı; AperiON yalnız karar gerektirenleri öne çıkarmalıdır.

## 45. BİLDİRİM POLİTİKASI
- AperiON adıyla telefon ve saatte bildirim.
- Kritik olay yoksa sessizlik.
- Aynı olay tekrar tekrar bildirilmez.
- Bilgi, uyarı, kritik ve gecikmiş seviyeleri.
- 7 gün, 3 gün, 1 gün ve vade sonrası alarm.
- Belge gelmediyse açık görev ve tekrar alarm.
- Ödeme gerçekleşmediyse otomatik talimat olsa bile açık görev.
- Bildirim tıklanınca ilgili kart, kaynak ve eylem açılmalıdır.
- Kullanıcının bot/otomasyon sağlığını manuel kontrol etmesi gerekmemelidir.

## 46. MOBİL, PWA VE TEK EKRAN DENEYİMİ
- iPhone'da PWA olarak ana ekrana eklenebilme.
- Apple touch icon ve AperiON marka ikonu.
- Standalone uygulama modu.
- Bugün / Ay sonuna kadar / Gecikenler hızlı aksiyonları.
- Onay Merkezi ve Moka hızlı geçişleri.
- Tek ekran komut merkezi.
- Mobilde yoğun tablo yerine sonuç, aksiyon ve drill-down.
- Telefon ve saat bildirimleri.

## 47. DASHBOARD VE RAPORLAMA STANDARTLARI
- Önce özet, sonra uyarılar, detay, kaynaklar, AI yorumu, işlem ve log.
- Isı haritaları.
- Trend grafikleri.
- Drill-down.
- Dönem karşılaştırmaları.
- Güven puanı.
- Kaynak kanıtı.
- Karar gerekçesi.
- Şirket sağlık skoru.
- Finansal netlik skoru.
- Yaşam dengesi skoru.
- Raporlar tek kaynaktan üretilebilmelidir.

## 48. GÜVENLİK VE GİZLİLİK
- Secret'lar GitHub Secrets veya güvenli secret manager'da.
- Token ve kimlik bilgileri sohbet veya public repo içinde tutulmamalıdır.
- Sızan tokenlar döndürülmelidir.
- Hassas belge erişimi rol ve kapsam bazlı olmalıdır.
- Şahsi sağlık, banka ve tapu belgeleri özel depoda.
- Audit log.
- Şifreleme.
- Yedekleme.
- Felaket kurtarma.
- Yetkisiz erişim alarmı.
- Servis hesabı ve kullanıcı hesabı ayrımı.

## 49. GELİŞTİRME VE PROJE YÖNETİMİ KURALLARI
- Doğrudan main üzerinde kontrolsüz değişiklik yapılmamalıdır.
- Branch, test, fark özeti ve kullanıcı onayı.
- Çalıştırılmamış test başarılı gösterilmemelidir.
- Bir ekranın görünmesi tamamlanma sayılmaz.
- Her özellik durumu: fikir, talep, tasarım, geliştiriliyor, kısmen çalışıyor, test bekliyor, kullanıcı onayı bekliyor, canlı, izleniyor, hatalı, durduruldu.
- Her geliştirme paketi küçük, doğrulanabilir ve geri alınabilir olmalıdır.
- Kod, migration, test, kurulum ve rollback talimatı birlikte verilmelidir.
- GitHub kodun; Master State ve handoff dosyaları proje hafızasının kaynağı olmalıdır.

## 50. CLAUDE İÇİN UYGULAMA TALİMATI
- Bu belgeyi bir özellik öneri listesi değil, ürün gereksinimleri ve proje hafızası olarak kabul et.
- Kodda olmayan hiçbir özelliği yapılmış varsayma.
- Önce mevcut GitHub repo ve canlı sistemi denetle.
- Her özelliği 'mevcut / kısmi / eksik / çelişkili / doğrulanmamış' olarak sınıflandır.
- Önce güvenilir veri omurgası, kaynak kanıtı, onay merkezi, audit, mükerrer koruma ve geri doğrulamayı tamamla.
- Sonra finansal netlik, anomali, tahmin ve üst akıl motorlarını gerçek veriye bağla.
- Yüksek etkili finansal işlemlerde kullanıcı açık onayı olmadan canlı kayıt yapma.
- Kullanıcıya kısa ama kanıtlı durum ve aksiyon sun; teknik ayrıntıyı drill-down'da tut.
