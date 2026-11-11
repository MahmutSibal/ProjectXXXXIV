# Şükran App — Kişisel Veri Envanteri (KVKK)

> Bu belge avukat / KVKK danışmanı incelemesi için hazırlanmıştır. Sistemin **fiilen**
> ne yaptığını anlatır; hukuki değerlendirme içermez. Son güncelleme: Kasım 2026.

## 1. Tutulan kişisel veriler

| Kişi grubu | Veri | Neden | Nerede / nasıl | Saklama |
|---|---|---|---|---|
| Üye müşteri, işletme sahibi, personel | Ad soyad, e-posta | Hesap, giriş | `Users` tablosu | Hesap silinene kadar |
| Üye müşteri, işletme sahibi | Telefon, adres | İletişim, fatura | `Users` | Hesap silinene kadar |
| Tüm hesaplar | Şifre | Giriş | Yalnızca geri döndürülemez özeti (PBKDF2-SHA256, tuzlu) | Hesap silinene kadar |
| Üye müşteri | Kampanya bildirimi izni + tarihi | Ticari ileti (açık rıza) | `Users` | Geri alınana / hesap silinene kadar |
| İşletme sahibi | T.C. kimlik no | Fatura (VUK) | `BillingProfiles` — **AES-256-GCM ile şifreli** | İşletme kaydı + yasal süre |
| İşletme | MERSİS no, fatura adresi, il, posta kodu | Fatura | `BillingProfiles` | İşletme kaydı + yasal süre |
| İşletme | IBAN, hesap sahibi unvanı / adı | Restorana ödeme aktarımı | `RestaurantPaymentSettings` | İşletme kaydı süresince |
| QR müşterisi | Sipariş içeriği, isteğe bağlı "sipariş veren" adı | Siparişin hazırlanması | `Orders` | Sipariş kaydı (VUK) |
| QR müşterisi | Yorum metni, görünen ad | Restoran yorumları | `Reviews` | Silinene / hesap silinene kadar (ad anonimleşir) |
| QR müşterisi | İade için IBAN, hesap sahibi adı | Para iadesi | `RefundRequests` | **Talep kapandıktan 90 gün sonra silinir** |
| Kayıt olan kişi | Telefon veya e-posta + kod özeti | Kayıt doğrulama | `PhoneVerifications` | **30 gün sonra silinir** |
| Tüm hesaplar | Oturum (yenileme) anahtarının özeti | Oturum | `RefreshTokens` | **Süresi dolduktan 30 gün sonra silinir** |
| İşletme / personel | İşlem kayıtları (kim, ne zaman, ne yaptı) | Güvenlik, denetim | `AuditLogs` | Süresiz — **saklama süresi belirlenmeli** |
| İşletme / Süper Admin | Destek / şikâyet metni, telefon | Destek | `SupportRequests`, `Complaints` | Süresiz — **saklama süresi belirlenmeli** |

## 2. Tutulmayan veriler

- **Kart bilgileri** (numara, son kullanma, CVV, kart sahibi): PayTR'nin sayfasında girilir,
  sistemimize hiç gelmez. Eskiden tutulan kart özetleri (`CustomerCards`) Kasım 2026'da silindi.
- **Kartla ödeyen müşterinin** ad, e-posta, telefon, adresi: PayTR'ye iletilir, **saklanmaz**.
  Ödeme kaydında (`CardPayments`) yalnızca sipariş no, tutar, durum ve transfer durumu var.
- IP adresi: kaydedilmez; yalnızca kartla ödemede PayTR'ye iletilir (PayTR zorunlu tutar).

## 3. Üçüncü taraflar ve yurt dışı aktarım

| Alıcı | Ne gider | Ülke | Not |
|---|---|---|---|
| PayTR | Ödeme tutarı, sepet, müşteri ad/e-posta/telefon/adres, IP; restoran IBAN ve unvanı (transfer) | Türkiye | Lisanslı ödeme kuruluşu |
| Brevo | E-posta adresi, doğrulama kodu içeren e-posta | Fransa (AB) | **Yurt dışı aktarım — KVKK m.9** |
| WhatsApp (Meta) | Telefon numarası, doğrulama kodu içeren mesaj | ABD / AB | **Yurt dışı aktarım — KVKK m.9** |
| MonsterASP (barındırma) | Veritabanının tamamı | **Teyit edilmeli** | Sunucu ülkesine göre m.9 |
| Restoran | Kendi siparişleri, masası, yorumları, iade talepleri | Türkiye | Ayrı veri sorumlusu |

## 4. Teknik önlemler

- Şifreler PBKDF2-SHA256 (tuzlu) özeti; T.C. kimlik no AES-256-GCM ile şifreli (anahtar JWT anahtarından türetilir).
- Tüm trafik HTTPS. Personel yalnızca kendi restoranının, QR müşterisi yalnızca kendi masasının
  verisine erişebilir (sunucu tarafında denetlenir).
- Pasife alınan / silinen hesabın oturumu en geç 30 saniyede kapanır.
- Amacı biten veriler otomatik silinir (`PersonalDataMaintenanceWorker`, 6 saatte bir).

## 5. İlgili kişi hakları (KVKK m.11)

- **Hesap silme:** "Hesabım" sayfası (`/hesabim`). Müşteri ve personel hesabı hemen
  anonimleştirilir (ad, e-posta, telefon, adres silinir; yorumlarda "Silinmiş kullanıcı").
  İşletme sahibinin talebi Süper Admin'e düşer (abonelik ve fatura kayıtları nedeniyle).
- Diğer talepler: [KVKK başvuru e-postası] — **tanımlanmalı**.

## 6. Avukatın karar vermesi gerekenler

1. Veri sorumlusunun unvanı, adresi, başvuru kanalı (aydınlatma metnindeki boşluklar).
2. Yurt dışı aktarım için yöntem (standart sözleşme + Kurul'a bildirim veya açık rıza).
3. VERBİS kaydı gerekip gerekmediği.
4. `AuditLogs`, `SupportRequests`, `Complaints` için saklama süreleri.
5. Restoran ile Şükran App arasındaki rol paylaşımı (veri sorumlusu / veri işleyen sözleşmesi).
6. Kampanya iletisi gönderilecekse İYS kaydı.
