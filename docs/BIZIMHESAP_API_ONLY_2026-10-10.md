# BizimHesap: API-islemleri-only (10 Ekim 2026)

Bu dokuman sadece BizimHesap B2B API rotalarini listeler; Chrome, Cloudflare Browser Run, Hermes ve TinyFish disarida tutulur.

| Islem | Endpoint | Canli test |
|---|---|---|
| Urunler | GET /products | Basarili; 3035 urun |
| Depolar | GET /warehouses | Basarili; 2 depo |
| Depo stoklari | GET /inventory/{depo-id} | Basarili; ilk depo |
| Musteriler | GET /customers | Basarili; 5782 musteri |
| Tedarikciler | GET /suppliers | Basarili; JSON veri dondu; adet olculmedi |
| Musteri ekstresi | GET /abstract/{musteri-id} | HTTP 429, testi ertele |
| Tedarikci ekstresi | GET /supplierabstract/{musteri-id} | Test bekliyor |
| Fatura/siparis ekle | POST /addinvoice | Resmi API dokumaninda, canli yazma testi yok |
| Fatura iptal | POST /cancelinvoice | Uygulama kodunda, canli test yok |
| Musteri ekle | POST /addcustomer | Uygulama kodunda, canli test yok |
| Urun ekle | POST /addproduct | Uygulama kodunda, canli test yok |

Islemleri destekleyen Supabase fonksiyonu: bizimhesap-b2b.
Masraf kaydetme, banka/kasa hareketi, tahsilat, odeme, virman icin dogrulanmis resmi B2B API endpointi bulunmadi.
Canli finansal POST testi ozel kullanici onayi olmadan yapilmayacak; process_queue cagirilmayacak.

Resmi dokuman: https://apidocs.bizimhesap.com/
Kaynak uygulama notlari: docs/archive/bizimhesap_b2b_api_notlari.md
