# AperiON Üst Akıl v1

Bu ilk çekirdek, kullanıcının gönderdiği dokuz istemi ayrı botlara bölmek yerine altı kalıcı yetenek altında toplar.

| Yetenek | Kapsam |
|---|---|
| Gün ve İş Yönetimi | Günlük plan, öncelik, toplantı, son tarih, delegasyon ve otomasyon önerisi |
| Araştırma ve Doğrulama | Kaynak, trend, istatistik, oyuncu, fırsat ve risk |
| Düşünceyi Yapılandırma | Ana fikir, eksik, çelişki, kural ve uygulama planı |
| Karar ve Problem Çözme | Kök neden, alternatif, etki, risk ve öneri |
| İş Fikri Doğrulama | Talep, müşteri, rekabet, gelir modeli ve MVP |
| İletişim ve Öğrenme | Yazı iyileştirme, sadeleştirme ve öğretici anlatım |

## Güvenlik sözleşmesi

- Yönlendirici yalnızca plan üretir; dış sisteme kendiliğinden yazmaz.
- Finans kaydı, mesaj/e-posta gönderimi, takvim olayı, merge ve silme açık kullanıcı onayı gerektirir.
- Eksik zorunlu bilgi varsa yürütme başlamaz; eksik alanlar kullanıcıya sorulur.
- Kanıtlar ve varsayımlar ayrı dizilerde tutulur.
- Her plan `external_write_performed: false` denetim kaydıyla başlar.

## Bu sürümün sınırı

v1 yalnızca niyet yönlendirme, eksik bilgi kapısı ve aksiyon onay politikasını içerir. E-posta, takvim, Slack, GitHub, Telegram ve Supabase bağlayıcıları sonraki katmanda eklenmelidir. Kullanıcının göndereceği yeni yetenekler mevcut altı yeteneğe eşlenir; gerçekten farklı bir alan oluşursa sürümlü yeni yetenek eklenir.
