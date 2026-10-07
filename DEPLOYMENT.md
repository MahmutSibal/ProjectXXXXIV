# Şükran App — Dağıtım (Deployment) Rehberi

Bu doküman uygulamayı geliştirme ortamından gerçek sunucuya taşımak için gerekli adımları içerir.

## 1. Sırlar (secrets) — en kritik adım

Bağlantı dizesi, JWT anahtarı ve parolalar **kod deposuna yazılmaz**; ortam değişkeninden okunur.
Uygulama, production ortamında zayıf/varsayılan JWT anahtarıyla açılmayı reddeder (fail-fast).

| Ortam değişkeni | Açıklama | Zorunlu |
|---|---|---|
| `JWT_SIGNING_KEY` | En az 32 karakter, rastgele. Sızarsa herkes token üretebilir. | **Evet** |
| `SUKRAN_DB_CONNECTION` | SQL Server bağlantı dizesi | Evet |
| `SUKRAN_SUPERADMIN_PASSWORD` | İlk SuperAdmin parolası | Evet |
| `SUKRAN_IYZICO_API_KEY` | iyzico API anahtarı | Ödeme alınacaksa |
| `SUKRAN_IYZICO_SECRET_KEY` | iyzico gizli anahtarı | Ödeme alınacaksa |
| `SUKRAN_WHATSAPP_TOKEN` | WhatsApp servisiyle paylaşılan jeton (en az 24 karakter) | `WhatsApp:Enabled=true` ise |
| `ASPNETCORE_ENVIRONMENT` | `Production` olmalı | Evet |

Güçlü bir JWT anahtarı üretmek için:

```bash
powershell -Command "[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))"
```

Windows'ta kalıcı olarak tanımlamak (sunucuda, yönetici olarak):

```bash
setx JWT_SIGNING_KEY "buraya-uretilen-anahtar" /M
```

> Not: `setx` ile tanımlanan değişkenler yalnızca yeni açılan süreçlerde görünür; IIS/servis yeniden başlatılmalıdır.

## 1.1. iyzico (ödeme sağlayıcısı)

Sağlayıcı `Payment:Provider` ile seçilir: `Fake` (yerleşik simülasyon, varsayılan) veya `Iyzico`.

**Geliştirmede** anahtarlar depoya yazılmaz, .NET user-secrets'ta tutulur:

```bash
cd backend/src/AppSukran.API
dotnet user-secrets set "Payment:Provider" "Iyzico"
dotnet user-secrets set "Payment:Iyzico:ApiKey" "sandbox-..."
dotnet user-secrets set "Payment:Iyzico:SecretKey" "sandbox-..."
dotnet user-secrets set "Payment:Iyzico:BaseUrl" "https://sandbox-api.iyzipay.com"
```

**Production'da** ortam değişkenleri kullanılır (`SUKRAN_IYZICO_API_KEY`, `SUKRAN_IYZICO_SECRET_KEY`)
ve `Payment:Provider` ile `Payment:Iyzico:BaseUrl` (`https://api.iyzipay.com`) appsettings.Production.json'a yazılır.

Uygulama açılışta hangi sağlayıcının aktif olduğunu loglar:

```
[Payment] Aktif sağlayıcı: Iyzico (yapılandırılmış: True)
```

> Bu satır `Fake` diyorsa yapılandırma okunmamıştır. Anahtar eksikken sessizce
> Fake'e düşmek, "ödeme çalışıyor" sanılmasına yol açtığı için log eklendi.

### Sandbox'a karşı test edilerek doğrulananlar

`/payment/auth` uç noktası, IYZWSv2 (HMAC-SHA256) imzalama ile çalışıyor. Aşağıdaki
alanlar tek tek denenerek düzeltildi — hepsi gerçek ret sebebiydi:

| Alan | Yanlış değer | Sonuç | Doğrusu |
|---|---|---|---|
| `buyer.email` | `...@appsukran.local` | `errorCode 5` — "email hatalı format" | Geçerli TLD'li adres |
| `buyer.email` | 67 karakterlik yerel kısım | Aynı hata | RFC 5321 sınırı 64; 48'e kırpılıyor |
| `basketItems[].itemType` | `PHYSICAL` | `errorCode 5000` — "ShippingAddress zorunludur" | `VIRTUAL` (adisyon kargolanmaz) |
| `paymentChannel` | `MOBILE` | — | `WEB` (mobil uygulama projeden çıkarıldı) |

Sandbox test kartları:

| Kart | Sonuç |
|---|---|
| `5528790000000008` | Başarılı |
| `4111111111111129` | "Kart limiti yetersiz, yetersiz bakiye" |

Başarısız ödemede adisyon bakiyesi değişmez (doğrulandı).

### Kartsız adisyon kapatma — yalnızca personel

Ödeme uçlarına kart bilgisi gönderilmezse tahsilat yapılmaz ve adisyon "dışarıda
ödendi" (nakit/havale) sayılarak kapatılır. Bu **yalnızca personel** içindir:
garson, nakit alınan ödemeyi sisteme işler.

> **Düzeltilen ciddi hata:** QR ile masadan bağlanan müşteri de kart göndermeden
> adisyonu kapatabiliyordu — yani QR bağlantısına erişen herkes hesabı bedava
> kapatabilirdi (`transactionId: null`, `provider: null`, kalan tutar 0).
> Artık QR müşterisi kart vermeden ödeme yapamaz.

| Kim | Kart yok | Kart var |
|---|---|---|
| Personel (Owner/Garson/Mutfak/SuperAdmin) | Nakit kaydı — izinli | Tahsilat yapılır |
| QR müşterisi | **HTTP 400 — reddedilir** | Tahsilat yapılır |

> **Canlıya almadan önce:** `Payment:Iyzico:DefaultIdentityNumber` şu an sabit bir
> değerdir (uygulama TC kimlik toplamıyor). Üye iş yeri sözleşmenizin bu alanı
> zorunlu kılıp kılmadığını iyzico ile teyit edin.

## 1.2. Bot koruması (reCAPTCHA kaldırıldı)

reCAPTCHA projeden **tamamen kaldırıldı** (backend doğrulayıcı, ayarlar, komut
alanları; frontend betiği, bileşeni ve site anahtarı).

Yerine giriş ve kayıt uçlarına hız sınırı kondu — `AuthController`'da daha önce
**hiç hız sınırı yoktu**, reCAPTCHA öylece silinseydi bu uçlar sınırsız parola
denemesine ve toplu hesap açmaya açık kalırdı.

| Uç | Sınır | Bölümleme |
|---|---|---|
| `/api/auth/*` | 10 istek / 5 dakika | **IP başına** |
| `/api/phone-verification/*` | 10 istek / 10 dakika | Genel |

IP başına bölümleme kasıtlıdır: tek bir sabit pencere paylaşılsaydı bir saldırgan
kotayı doldurup bütün müşterilerin girişini engelleyebilirdi. Gerçek istemci IP'si
için `UseForwardedHeaders` hız sınırlayıcıdan önce çalışır.

> Deneme sürümü kötüye kullanımına karşı asıl koruma, yenileme için saklı kart
> zorunluluğudur; bot doğrulaması bunun yerini tutmaz.

## 1.3. ngrok ile geçici dış erişim (ARTIK KULLANILMIYOR — bkz. 3.1 ve 4)

Frontend ve backend **tek tünelden** servis edilir: tarayıcı yalnızca Vite sunucusunu
görür, `/api`, `/uploads` ve `/hubs` istekleri `vite.config.js` içindeki proxy ile
backend'e (`localhost:5021`) iletilir. İki ayrı tünel gerekmez.

```bash
ngrok http --url=starr-haustorial-robin.ngrok-free.dev 5173
```

Gerekli ayarlar (`frontend/.env`):

```
VITE_API_BASE_URL=/api
VITE_PUBLIC_APP_URL=https://starr-haustorial-robin.ngrok-free.dev
```

Kontrol listesi:
- [ ] Backend çalışıyor (`localhost:5021`) — proxy ona bağlanır
- [ ] `vite.config.js` içindeki `server.allowedHosts` tünel alan adını kapsıyor
      (kapsamazsa Vite "Blocked request" döner ve sayfa hiç açılmaz)
- [ ] `VITE_PUBLIC_APP_URL` tünel adresi — QR kodları bu adresi gömer

> ngrok ücretsiz planında ilk ziyarette bir uyarı sayfası çıkar; kullanıcı
> "Visit Site" demeden uygulamaya ulaşamaz. Tünel adresi her yeniden başlatmada
> değişirse `VITE_PUBLIC_APP_URL` güncellenmeli, **aksi hâlde basılmış QR kodları çalışmaz**.

## 1.5. WhatsApp ile telefon doğrulama (Baileys)

Kayıt olan işletmenin telefonuna 6 haneli kod gönderilir. Kod doğrulanmadan hesap açılmaz.

### Neden ayrı servis, neden Baileys

WhatsApp'a bağlanmak .NET süreci içinde yapılamaz; ayrıca oturumun uzun ömürlü ve
tek örnek olması gerekir. Bu yüzden `services/whatsapp` altında bağımsız bir Node
servisi çalışır, backend onunla yalnızca HTTP konuşur.

Servis **wppconnect'ten Baileys'e taşındı**. wppconnect, WhatsApp Web'i gerçek bir
Chromium penceresinde sürüyordu ve tek başına 400 MB–1 GB bellek istiyordu;
barındırma planı **256 MB** veriyor, oraya sığmıyordu. Baileys protokolü doğrudan
WebSocket üzerinden konuşur — tarayıcı açmaz, paket 49 MB, bellek ihtiyacı onlarca MB.

> Sürüm `6.7.24`e **sabitlendi**. npm'de `latest` etiketi bir sürüm adayını
> (`7.0.0-rc14`) gösteriyor; ikisi de aynı gün yayınlanmış, yani 6.7.x hâlâ bakılan
> kararlı hat. Üretimde RC kullanmıyoruz.

HTTP sözleşmesi değişmedi (`/status`, `/session/start`, `/session/logout`, `/send`);
backend tarafında hiçbir değişiklik gerekmedi.

### Yayına alma

WhatsApp servisi **kendi MonsterASP sitesinde** çalışır (API ve frontend'den ayrı).
IIS, Node uygulamalarını `httpPlatformHandler` ile çalıştırır: süreci başlatır,
dinleyeceği portu `HTTP_PLATFORM_PORT` ile bildirir ve önüne ters vekil olur.

```bash
powershell -File scripts\publish-whatsapp.ps1
```

Betik `WHATSAPP_SERVICE_TOKEN` ortam değişkenini ister, bağımlılıkları üretim
modunda kurar ve jetonu `web.config`'e yerleştirir.

> Yayın klasörüne `tokens/` **kopyalanmaz**. O klasör WhatsApp oturum kimliğidir ve
> sunucuda QR okutularak oluşur. Yerelden taşımak aynı oturumun iki yerde açılmasına
> ve bağlantının sürekli düşmesine yol açar.

### Yayına alırken iki tuzak (ikisi de canlıda yaşandı)

**1. web.config'e fazladan öznitelik eklemeyin.** `<httpPlatform>` etiketine
`startupRetryCount` ve `requestTimeout` eklendiğinde IIS yapılandırmayı reddetti,
site 500 döndü ve Node süreci hiç başlatılmadığı için **log dosyası bile oluşmadı** —
teşhis edecek hiçbir iz yoktu. Şablondaki öznitelik kümesi çalıştığı doğrulanmış
olandır; değiştirirseniz `/status` ucunun 200 döndüğünü mutlaka sınayın.

**2. Sync ederken `tokens/` ve `logs/` klasörlerini atlayın.** msdeploy, kaynakta
olmayan dosyaları hedeften SİLER. `logs/` çalışan süreç tarafından kilitli olduğu
için yayın hata verir; daha kötüsü `tokens/` silinirse **WhatsApp oturumunuz düşer
ve QR'ı yeniden okutmanız gerekir**.

```
msdeploy -verb:sync -source:contentPath=publish-whatsapp -dest:... ^
  -skip:objectName=dirPath,absolutePath=\logs$ ^
  -skip:objectName=filePath,absolutePath=\logs\ ^
  -skip:objectName=dirPath,absolutePath=\tokens$ ^
  -skip:objectName=filePath,absolutePath=\tokens\
```

### Güvenlik — burada değişen şey

Servis eskiden yalnızca `127.0.0.1` dinliyordu ve "asla internete açmayın" notu vardı.
MonsterASP'ta bir site **herkese açıktır**; artık tek koruma paylaşılan jetondur.

- Jeton **en az 24 karakter** olmalı; servis kısa jetonla başlamayı reddeder
- Aynı değer backend'de `SUKRAN_WHATSAPP_TOKEN` olarak tanımlanmalı
- `web.config` jetonu açık metin taşır; `.gitignore`'dadır (şablon depoda kalır)
- `tokens/`, `node_modules/` ve `logs/` istek filtresiyle gizlenir — oturum
  dosyaları hattınıza tam erişim verir

### Uygulama havuzu uykusu

`httpPlatformHandler` da boşta kalan süreci kapatır; süreç ölünce WhatsApp
bağlantısı düşer. API'deki gibi bu siteye de düzenli bir istek gerekir
(bkz. `.github/workflows/keep-alive.yml`).

### Oturum açma

SuperAdmin > WhatsApp sayfasından "Oturumu Başlat" denir, çıkan QR telefondan
(WhatsApp > Bağlı Cihazlar > Cihaz Bağla) okutulur. Kimlik `tokens/` altına yazılır;
servis yeniden başladığında QR tekrar gerekmez.

Bağlantı koptuğunda servis kendiliğinden yeniden bağlanır. Yalnızca telefondan
çıkış yapılırsa (`loggedOut`) kayıtlı kimlik silinir ve yeni QR istenir.

### Yerel olarak doğrulananlar

| Kontrol | Sonuç |
|---|---|
| Jetonsuz / yanlış jetonla istek | HTTP 401 |
| Doğru jetonla `/status` | `status: qr` + geçerli PNG (276×276) |
| Bağlı değilken `/send` | HTTP 503 `not_connected` |
| Eksik alanla `/send` | HTTP 400 |
| Jeton 24 karakterden kısa | Servis başlamıyor |

### Akış ve sınırlar

| Aşama | Davranış |
|---|---|
| Kod gönderimi | Hız sınırı (10 istek / 10 dk); her istek dışarıya mesaj yollar |
| Kod ömrü | `WhatsApp:CodeLifetimeSeconds` (varsayılan 180 sn) |
| Yeniden gönderim | `WhatsApp:ResendCooldownSeconds` (varsayılan 60 sn) |
| Yanlış deneme | En fazla 5; aşılırsa kod geçersizleşir |
| Doğrulama jetonu | 15 dk geçerli, **tek kullanımlık** |

Kod veritabanında **düz metin tutulmaz**, SHA-256 özeti saklanır.

### Kalıcı risk

Baileys de resmî olmayan bir istemcidir. Kendi numaranızdan toplu doğrulama kodu
göndermek, numaranın **WhatsApp tarafından engellenmesine** yol açabilir. Bu,
kütüphane değiştirerek çözülen bir şey değildir; gerçek müşteri hacminde resmî
WhatsApp Business API'ye veya SMS'e geçmek gerekir.

## 1.6. Paketler, fiyatlar ve abonelik yaşam döngüsü

### Fiyatın tek kaynağı backend'dir

Fiyatlar `AppSukran.Domain/Subscriptions/PlanCatalog.cs` içindedir. **Frontend'de
hiçbir yerde sabit fiyat tutulmaz**; tüm tutarlar `GET /api/subscriptions/plans`
ve `GET /api/subscriptions/quote` uçlarından gelir. Ödeme başlatılırken istemcinin
gönderdiği tutar kullanılmaz — tutar paket koduna göre sunucuda yeniden hesaplanır.

| Paket | Aylık | Yıllık (liste) | Yıllık (%10 indirimli) | Sipariş | Panel |
|---|---|---|---|---|---|
| Lite | 1.900 TL | 22.800 TL | **20.520 TL** | Yok | Yok |
| Pro | 3.990 TL | 47.880 TL | **43.092 TL** | 1.500/dönem | 1 mutfak + 1 garson |
| Business | 7.990 TL | 95.880 TL | **86.292 TL** | 5.000/dönem | Tümü |
| Enterprise | Teklif | — | — | Özel | Özel |

14 günlük ücretsiz deneme **yalnızca Pro** pakette sunulur.

Fiyat değiştiğinde `PlanCatalog.PriceVersion` artırılır. Bu sürüm her aboneliğe ve
her ödeme kaydına yazılır; hangi kaydın hangi tarifeyle ücretlendirildiği izlenebilir.

### Abonelik yaşam döngüsü

| Durum | Erişim | Açıklama |
|---|---|---|
| Trialing / Active | Dönem sonuna kadar | Normal kullanım |
| **Cancelled** | **Ödenmiş dönem sonuna kadar** | İptal yalnızca sonraki yenilemeyi durdurur |
| PastDue | Dönem sonu **+ 30 gün** | "Ödeme bekleniyor"; hizmet açık kalır |
| Expired | Yok | Ek süre de dolmuş |

Dönem her müşterinin **kendi başlangıç tarihine** göre hesaplanır (takvim ayı değil).

Başarısız tahsilatta `PaymentFailureCount`, `LastPaymentError` ve
`LastPaymentAttemptAt` kaydedilir; kullanıcı panelinde son hata gösterilir.

> **Ticari risk:** ödeme alınamasa da hizmet 30 gün açık kalır. Süre sonunda erişim
> `SubscriptionExpiryWorker` tarafından **otomatik** kesilir.

### Otomatik yenileme (saklı kart)

`SubscriptionRenewalWorker` saatte bir çalışır; dönemi biten ve saklı kartı olan
abonelikleri otomatik tahsil eder. Deneme sürümü de burada sonlanır: 14. günün
sonunda müşterinin seçtiği paket/dönem tutarı çekilir ve abonelik Pro'ya geçer.

**Kart numarası veritabanımızda TUTULMAZ.** Kart iyzico'da saklanır
(`/cardstorage/card`), biz yalnızca `cardUserKey` + `cardToken` referanslarını
tutarız; tahsilat bunlarla yapılır. Böylece PCI kapsamı dışında kalırız.

| Aşama | Uç / Bileşen |
|---|---|
| Kart tanımlama (tahsilat yok) | Yönetim > Aboneliğim > Ödeme Yöntemi<br>`PUT /api/subscriptions/restaurant/{id}/card` |
| Dönem sonu tahsilat | `SubscriptionRenewalWorker` (saatlik) |
| İptal | `AutoRenew=false` → sonraki tahsilat yapılmaz |

Üst üste 4 başarısız denemeden sonra otomatik deneme durur; kullanıcı kartını
güncelleyince sayaç sıfırlanır ve yeniden denenir.

> **Dikkat — iki worker aynı kaydı güncellemesin:** `SubscriptionExpiryWorker`,
> otomatik yenilemesi olan abonelikleri artık atlar. Aksi hâlde tahsilat başarılı
> olsa bile "ödeme alınamadı" işaretlemesi başarının üzerine yazıyor ve hata
> sayacı yanlışlıkla artıyordu (test sırasında yakalandı).

### Doğrulanan otomatik yenileme senaryoları

| Senaryo | Sonuç |
|---|---|
| Kart tanımlama | Tahsilat yapılmaz, `autoRenew=true`, `****0008` |
| Deneme bitti, kart geçerli | Pro'ya geçti, 3.990 TL çekildi, `tx=37054346` |
| Tahsilat reddedildi | `PastDue`, hata sayacı 1, son hata kaydedildi |
| Reddedilmiş abonelik | Erişim ek süre boyunca **devam ediyor** |

### Doğrulanan senaryolar

| Senaryo | Sonuç |
|---|---|
| Aktif, dönem sürüyor | Erişim var |
| İptal, ödenmiş dönem sürüyor | **Erişim var** |
| İptal, dönem bitti | Erişim yok |
| Ödeme bekleniyor, 29 gün geçti | Erişim var |
| Ödeme bekleniyor, 31 gün geçti | Erişim yok (otomatik) |
| Lite pakette sipariş | HTTP 402 — "yalnızca QR menü içerir" |
| Enterprise otomatik satın alma | HTTP 400 — "teklif usulüdür" |

## 1.7. Fatura ve kimlik bilgileri

İşletme sahibi **Yönetim > Fatura Bilgileri** ekranından doldurur.
Abonelik faturası bu bilgilerle kesilir.

| Alan | Kural |
|---|---|
| Ad Soyad | Zorunlu, en az 3 karakter |
| E-posta | Zorunlu, biçim kontrolü, küçük harfe çevrilir |
| Telefon | Zorunlu, E.164'e normalize edilir |
| T.C. Kimlik No | Zorunlu, **resmî sağlama algoritmasıyla** doğrulanır |
| MERSİS No | İsteğe bağlı; verilirse 16 hane olmalı |
| Fatura Adresi | Zorunlu, en az 10 karakter |
| İl / Ülke | Zorunlu |
| Posta Kodu | Zorunlu, 5 hane |

### Hassas veri işleme

- T.C. kimlik ve MERSİS numaraları **API yanıtlarında yalnızca maskeli döner**
  (`491******44`). Açık değer sunucudan hiç çıkmaz.
- Denetim kayıtlarına da yalnızca maskeli hâli yazılır.
- Düzenleme sırasında alan boş bırakılırsa kayıtlı değer korunur; kullanıcı
  numarayı yeniden yazmak zorunda kalmaz.
- Erişim yalnızca işletme sahibi (kendi kaydı) ve SuperAdmin ile sınırlıdır.

> **Eksik:** numaralar veritabanında **şifrelenmiyor**, yalnızca maskeleniyor.
> Veritabanı yedeklerine erişebilen biri açık değerleri görebilir. Gerçek
> müşteri verisi girilmeden önce sütun bazlı şifreleme (Always Encrypted veya
> uygulama düzeyinde) değerlendirilmelidir.

## 1.7.1. Restoran bazlı ödeme ve havale bilgileri

**Platform işletmelerin cirosuna dokunmaz.** İşletme sahiplerinin şirketi olmayabileceği için
masa ödemeleri platformun hesabına değil, işletmenin **kendi iyzico üye iş yeri hesabına** gider.

| Ne | Nereye gider | Hangi geçit |
|---|---|---|
| Masa ödemesi (QR müşterisi kartı) | İşletmenin kendi iyzico hesabı | İşletmenin şifreli anahtarlarıyla kurulan geçit |
| Abonelik (kart saklama, yenileme, paket değişikliği) | Platform | Global `Payment:*` ayarları (değişmedi) |
| Abonelik havale/EFT | Platformun banka hesabı | — (bilgiler SuperAdmin tarafından girilir) |

- **Opt-in:** Her işletmede online kart ödemesi varsayılan **kapalıdır**. İşletme sahibi
  ayarlardan açar ve kendi iyzico API/gizli anahtarını girer. Kapalıyken QR müşterisinin
  kart ödemesi HTTP 400 ("Bu işletme online kart ödemesi almıyor.") ile reddedilir;
  personelin kartsız nakit kaydı etkilenmez.
- **Havale bilgileri:** SuperAdmin banka adı, hesap sahibi ve IBAN girer
  (`PUT /api/platform-settings/payment`); Türkiye IBAN'ı mod-97 ile doğrulanır. Bilgiler
  herkese açık sayfalarda gösterilir (`GET /api/platform-settings/payment`, girişsiz).
- **Havale/EFT açma-kapama:** SuperAdmin `bankTransferEnabled` ile havaleyi açıp kapatır.
  Kapalıyken herkese açık GET tüm banka alanlarını boş döner (`isConfigured=false`,
  `bankTransferEnabled=false`); kayıtlı bilgiler silinmez. SuperAdmin ekranı kayıtlı
  değerleri `GET /api/platform-settings/payment/admin` ile (anahtardan bağımsız) okur.
- **Ödeme altyapısı anahtarları:** SuperAdmin `PUT /api/platform-settings/payment-options`
  (`{ showIyzicoLogos, cardPaymentsEnabled }`) ile (a) web sitesindeki iyzico logo bandını
  gösterir/gizler, (b) platform genelinde online **kart** ödemesini açar/kapatır. Herkese açık
  okuma `GET /api/platform-settings/payment-options` (girişsiz, hata durumunda iki değer de `true`).
  Kayıt yoksa ikisi de açıktır. Ana anahtar kapalıyken işletmenin kendi ayarı ne olursa olsun
  `GET /api/restaurants/{id}/online-payment` `enabled=false` döner ve QR müşterisinin kart
  ödemesi HTTP 400 ("Online kart ödemesi şu anda kapalı.") ile reddedilir; personelin kartsız
  nakit kaydı ve abonelik akışları etkilenmez. İşletme sahibi ekranı için
  `GET /api/restaurants/{id}/payment-settings` yanıtında `cardPaymentsAllowedByPlatform` döner.
  Banka bilgileri bu uçtan etkilenmez (ve banka PUT'u bu iki bayrağı korur).
- **Sırlar şifrelenir:** İşletmenin iyzico anahtarları veritabanına AES-256-GCM ile
  şifreli yazılır (`v1:` + base64(nonce|tag|şifreli)); anahtar, JWT imza anahtarından
  HKDF-SHA256 ile türetilir. API yanıtlarında yalnızca maskeli API anahtarı
  (`sand••••3f`) döner; gizli anahtar hiç dönmez, denetim kaydına yazılmaz.
- **JWT anahtarı döndürülürse:** `JWT_SIGNING_KEY` değiştirildiğinde kayıtlı işletme
  anahtarları **çözülemez** (`hasCredentials=false`, online ödeme fiilen kapanır).
  İşletme sahiplerinin iyzico anahtarlarını yeniden girmesi gerekir. Bu nedenle anahtar
  döndürmeden önce işletmeleri bilgilendirin.
- **Global `Payment:Provider = Fake` iken:** Tüm tahsilatlar simülasyondur. İşletme online
  ödemeyi anahtarsız açabilir; masa ödemeleri `FakePaymentGateway` ile yapılır ve gerçek
  para hareketi olmaz. Ayar ekranları bunu `globalProviderIsFake` ile açıklar.
- İzin verilen iyzico adresleri: `https://api.iyzipay.com` (canlı) ve
  `https://sandbox-api.iyzipay.com`. Başka adres reddedilir.
- Yeni tablolar: `PlatformPaymentSettings`, `RestaurantPaymentSettings` (migration
  `AddPaymentSettings`, yalnızca yeni tablo ekler). Ardından migration `AddBankTransferToggle`
  `PlatformPaymentSettings` tablosuna `BankTransferEnabled` (bit, varsayılan `1`) sütununu ekler. Son olarak migration `AddPaymentOptions` aynı tabloya `ShowIyzicoLogos` ve
  `CardPaymentsEnabled` (bit, NOT NULL, varsayılan `1`) sütunlarını ekler; mevcut kayıtlar açık kalır.
- **Bakım modu duyurusu:** SuperAdmin `PUT /api/platform-settings/status`
  (`{ maintenanceEnabled, message, serverDisabled }`) ile bakım duyurusunu açıp kapatır; herkese açık
  `GET /api/platform-settings/status` durumu döner (kayıt yoksa/okunamazsa hepsi varsayılan:
  `false`). `maintenanceEnabled` yalnızca bir **duyurudur**: sunucu hiçbir isteği engellemez; bakım
  ekranını arayüz gösterir. Yeni tablo `MaintenanceSettings`
  (migration `AddMaintenanceMode`, yalnızca yeni tablo ekler).
- **Sunucu kapatma (yazılımsal):** IIS süreci durdurulamaz (kimse geri başlatamaz), bu yüzden
  `serverDisabled = true` iken `ServerShutdownMiddleware` SuperAdmin dışındaki her isteğe
  `503` (`Retry-After: 60`, JSON gövde "Sunucu şu anda kapalı.") döner. SuperAdmin hiç engellenmez.
  `serverDisabled` gönderilmezse (eski ön yüz) kayıtlı değer korunur. Kapalıyken de erişilebilir
  kalanlar: `OPTIONS` (CORS), `/api/health`, `/api/health/ready`, `GET /api/platform-settings/status`,
  `POST /api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`. Bayrak ~5 sn önbelleklenir; PUT
  sonrası bu instance'ta anında etkili olur. Bayrak okunamazsa fail-open (istek geçer).
  Yeni sütun `MaintenanceSettings.ServerDisabled` (bit, varsayılan `0`; migration
  `AddServerShutdown`, yalnızca sütun ekler).
  **SuperAdmin giriş yapamıyorsa yeniden açmak için** SQL Server'da:
  `UPDATE MaintenanceSettings SET ServerDisabled = 0` (health ve auth uçları kapalıyken de
  erişilebilir; etki en geç ~5 sn içinde görülür, gerekirse uygulama havuzunu geri dönüştürün).

## 1.8. Canlı sipariş bildirimi (SignalR)

Masadan sipariş verildiğinde mutfak ve yönetim ekranları **kendiliğinden** güncellenir.

> Öncesinde hiçbir otomatik yenileme yoktu — ne SignalR ne de periyodik istek.
> Sipariş, biri sayfayı elle yenileyene kadar mutfakta görünmüyordu.

### Kiracı ayrımı — düzeltilen güvenlik açığı

Hub eskiden **anonimdi** ve `JoinRestaurantGroup(restaurantId)` istemcinin verdiği
kimliği doğrudan kabul ediyordu. Yani bir restoranın kimliğini bilen herkes o gruba
katılıp siparişlerini canlı izleyebiliyordu: ürünler, masa numaraları, tutarlar.
Backend olayları gerçekten yayınladığı için açık kullanılabilir durumdaydı.

Şimdi hub `[Authorize]` ile korunur ve bağlantı, **token'daki `restaurantId`**
claim'ine ait gruba otomatik eklenir. İstemci hangi restoranı dinleyeceğini seçemez.

| Deneme | Sonuç |
|---|---|
| Tokensiz `negotiate` | HTTP 401 |
| Uydurma token | HTTP 401 |
| Geçerli token | Bağlanır, yalnızca kendi restoranının grubuna girer |

### Kimin hangi grubu dinlediği

Grup seçimi istemciye **bırakılmaz**, token'daki claim'lerden türetilir
(`OrderHub.GroupFor`). Grup adları tek kaynaktan gelir (`OrderGroups`); hub ile
yayıncı ayrı ayrı yazsaydı birindeki değişiklik diğerini sessizce bozar,
kimse hata almaz, bildirimler yalnızca gelmez olurdu.

| Bağlanan | Grup | Ne alır |
|---|---|---|
| Personel (Owner/Mutfak/Garson) | `restaurant:{id}` | Restoranın tüm siparişleri |
| QR müşterisi | `restaurant:{id}:table:{no}` | **Yalnızca kendi masası** |
| SuperAdmin (restorana bağlı değil) | — | Hiçbiri |

> **Dikkat:** QR müşterisinin token'ında da `restaurantId` bulunur. Yalnızca ona
> bakılsaydı masadaki misafir, salondaki BÜTÜN masaların siparişlerini canlı
> izleyebilirdi. Bu yüzden müşteri rolü masa grubuna yönlendirilir.

### Bağlanan ekranlar

| Ekran | Öncesi | Şimdi |
|---|---|---|
| Mutfak Paneli | Otomatik yenileme yok | Canlı |
| Aktif Siparişler | Otomatik yenileme yok | Canlı |
| Mutfak Masaları | Otomatik yenileme yok | Canlı |
| Müşteri menüsü (Siparişlerim) | 5 sn'de bir istek | Canlı |
| Sipariş Geçmişi (yönetim/mutfak) | — | **Bilerek bağlanmadı**: sayfalı ve süzgeçli bir liste; canlı ekleme kullanıcının filtresiyle çakışırdı |

Müşteri menüsündeki 5 saniyelik yoklama kaldırıldı: masadaki her açık telefon,
hiçbir şey değişmese bile sunucuyu sürekli meşgul ediyordu (256 MB'lık paylaşımlı
planda bu gerçek bir yük).

### Token neden sorgu parametresinde

WebSocket el sıkışması özel başlık taşıyamaz; SignalR token'ı `access_token`
sorgu parametresiyle gönderir. `JwtBearerEvents.OnMessageReceived` bunu **yalnızca
`/hubs` yollarında** kabul eder — her uçta kabul edilseydi token sunucu erişim
loglarına ve Referer başlıklarına düşerdi.

### İstemci tarafı

Gelen olay listeye doğrudan EKLENMEZ, "yeniden yükle" sinyali olarak kullanılır
(`useOrderRealtime`). Sunucu ham `Order` varlığını yayınlar, ekranlar ise API'nin
DTO biçimini bekler; ikisini birleştirmek sessiz biçim uyuşmazlığı üretirdi.

- Art arda gelen olaylar 250 ms'de tek yeniden yüklemeye indirilir
- `accessTokenFactory` her denemede token'ı yeniden okur; yenilenen token'la yeniden bağlanır
- Bağlantı koptuğu sürede kaçan olaylar telafi edilemez, bu yüzden **yeniden bağlanınca liste baştan çekilir**
- Ekranda `RealtimeStatus` göstergesi vardır: bağlantı sessizce koparsa personel
  bayat listeye bakıp "sipariş yok" sanmasın

### Canlıda doğrulandı

Test işletmesi kurulup masadan gerçek sipariş verildi; yönetim ekranı **hiç
yenilenmeden** "aktif sipariş yok" durumundan siparişi gösterir hâle geçti.
MonsterASP WebSocket'i destekliyor.

Masa ayrımı hub seviyesinde ayrıca sınandı (iki masa, iki dinleyici):

| Olay | Beklenen | Sonuç |
|---|---|---|
| Masa 2 siparişi → masa 1 müşterisi | 0 | **0** |
| Masa 2 siparişi → personel | 1 | 1 |
| Masa 1 siparişi → masa 1 müşterisi | 1 | 1 |
| Masa 1 siparişi → personel | 1 | 1 |

Test verisi sonrasında tamamen silindi.

## 2. Veritabanı

Şema, uygulama açılışında bekleyen EF Core migration'larını otomatik uygular
(`DatabaseMigrationInitializer`). Ayrıca elle çalıştırmak isterseniz:

```bash
dotnet ef database update --project backend/src/AppSukran.Infrastructure --startup-project backend/src/AppSukran.API
```

Production'da kullanılan SQL Server hesabının `db_owner` yetkisi olmalıdır (migration DDL çalıştırır).

## 3. Backend'i yayına alma

```bash
dotnet publish backend/src/AppSukran.API -c Release -o ./publish
```

`./publish` klasörünü sunucuya kopyalayın ve IIS / Windows Service / Kestrel arkasında çalıştırın.

Kontrol listesi:
- [ ] `ASPNETCORE_ENVIRONMENT=Production`
- [ ] `appsettings.Production.json` içindeki `Cors:AllowedOrigins` gerçek alan adınızla güncellendi
- [ ] `AllowedHosts` gerçek alan adınızla güncellendi
- [ ] Swagger production'da kapalı (kod bunu zaten yalnızca Development'ta açar)
- [ ] `wwwroot/uploads` klasörü mevcut ve uygulama havuzunun yazma izni var

## 3.1. MonsterASP.NET (paylaşımlı IIS barındırma)

Seçilen barındırma. Ücretsiz plan: 5 GB disk, **1 GB veritabanı**, 1 site,
`*.runasp.net` alt alan adı, özel alan adı yok.

```bash
powershell -File scripts\publish-monsterasp.ps1 -SiteHost "SITENIZ.runasp.net" -FrontendOrigin "https://SITENIZ.runasp.net" -IyzicoSandbox
```

Betik `dotnet publish` çalıştırır ve sırları `publish/web.config` içine yazar.
Sonra `publish/` klasörünün **içeriğini** sunucuda `wwwroot` altına yükleyin.

> `publish/` ve `web.config` `.gitignore`'dadır — üretilen dosya bağlantı dizesini,
> JWT anahtarını ve iyzico anahtarlarını **açık metin** taşır.

### Ortam değişkenleri web.config'e yazılır

MonsterASP'ta ortam değişkeni ayarlayacak bir panel yoktur. IIS'teki karşılığı
`<aspNetCore><environmentVariables>` bölümüdür; betik bunu üretir. Uygulama
`WebApplication.CreateBuilder` kullandığı için tüm ayarlar bu yolla geçilebilir
(iç içe anahtarlar `__` ile: `Cors__AllowedOrigins__0`).

### Veritabanı — iki farklı adres

MonsterASP'ın verdiği bağlantı dizesindeki `dbXXXXX.databaseasp.net` adı
**özel bir IP'ye** (10.0.0.x) çözülür; yalnızca MonsterASP'ın kendi ağı içinden
erişilir. Dışarıdan (SSMS, `dotnet ef`, yerel test) bağlanmak için panelden
**Remote Access** açılmalı ve şu ad kullanılmalıdır:

```
dbXXXXX.public.databaseasp.net
```

| Ayar | Değer | Neden |
|---|---|---|
| Sunucu (uygulama içinden) | `dbXXXXX.databaseasp.net` | İç ağ, daha hızlı |
| Sunucu (dışarıdan) | `dbXXXXX.public.databaseasp.net` | Genel IP |
| `Encrypt` | **`True`** | Sağlayıcının verdiği dize `Encrypt=False`'tur; parola ve veri açık İnternet üzerinden **şifresiz** gider |
| `TrustServerCertificate` | `True` | Sertifika kendinden imzalı; `Encrypt=True` tek başına "sertifika zinciri güvenilmiyor" hatası verir |

Şema, uygulama ilk açılışta migration'ları otomatik uygular. Elle uygulamak için:

```bash
powershell -Command "$env:SUKRAN_DB_CONNECTION='...public...'; dotnet ef database update --project backend/src/AppSukran.Infrastructure --startup-project backend/src/AppSukran.API"
```

### Uygulama havuzu uykusu — abonelik tahsilatını durdurur

Paylaşımlı IIS'te bir süre istek almayan uygulama havuzu kapatılır. Havuz
kapandığında `SubscriptionRenewalWorker` da durur; **dönemi biten abonelikler
tahsil edilmez**. Bunun için hafif bir canlılık ucu eklendi:

| Uç | İşi |
|---|---|
| `GET /api/health` | Veritabanına dokunmaz. Dışarıdan düzenli çağrılarak süreç ayakta tutulur |
| `GET /api/health/ready` | Veritabanı bağlantısını ve bekleyen migration sayısını doğrular |

Ücretsiz bir zamanlayıcıyla (ör. cron-job.org) `/api/health` adresini 10 dakikada
bir çağırın. `ready` ucunu **kullanmayın** — her çağrıda veritabanına gider.

### Yayına almadan önce üç tuzak

1. **`AllowedHosts`.** `appsettings.Production.json` içinde `sukranapp.com`
   yazılıdır. `*.runasp.net` adresi bu listede yoksa ASP.NET Core **her isteğe
   400 döner** ve site "sebepsiz" çalışmaz. Betik `-SiteHost` ile bunu geçer.

2. **iyzico adresi.** `appsettings.Production.json` canlı adresi
   (`https://api.iyzipay.com`) içerir. Elinizdeki anahtarlar sandbox'tur ve canlı
   adrese karşı çalışmaz — `-IyzicoSandbox` ekleyin. Açılış logundaki
   `[Payment] Aktif sağlayıcı:` satırı `yapılandırılmış: False` diyorsa anahtarlar
   okunmamıştır.

3. **HTTPS.** Panelden (Let's Encrypt) açılmalıdır. Frontend Vercel'de HTTPS
   sunulduğu için sertifika yoksa tarayıcı tüm API isteklerini engeller.
   Açtıktan sonra bağlamanın oturması ~1 dakika sürer; hemen denerseniz
   TLS el sıkışması reddedilir, bu normaldir.

### Doğrulanan davranışlar

| Kontrol | Sonuç |
|---|---|
| Uzak veritabanına şifreli bağlantı | Çalışıyor (SQL Server 2025 Express) |
| 9 migration uzak veritabanına uygulandı | 21 tablo, veritabanı 16 MB / 1 GB |
| Production modunda uzak veritabanıyla açılış | Başarılı |
| `/api/health` · `/api/health/ready` | 200 · `pendingMigrations: 0` |
| Swagger production'da | 404 (kapalı) |
| `appsettings.Development.json` yayın çıktısında | Yok (çıkarıldı — içinde varsayılan parola var) |

## 4. Frontend'i yayına alma (MonsterASP — ikinci site)

Frontend ve API **ayrı MonsterASP siteleridir**; ikisi de aynı panelden yönetilir.

| | Site | Alan adı |
|---|---|---|
| API | `site84512` | `mahmutapp.tryasp.net` |
| Frontend | `site84631` | `sukranapp.runasp.net` |

### Derleme ve gönderme

```bash
cd frontend && npm ci && npm run build
```

Oluşan `dist/` klasörü WebDeploy ile frontend sitesine gönderilir. Backend'in
aksine burada ortam değişkeni enjekte edilmez; Vite değerleri derleme anında
koda gömer, bu yüzden `.env.production` derlemeden ÖNCE doğru olmalıdır:

```
VITE_API_BASE_URL=https://mahmutapp.tryasp.net/api
VITE_PUBLIC_APP_URL=https://sukranapp.runasp.net
```

`VITE_PUBLIC_APP_URL` masa QR kodlarına gömülen adrestir ve **frontend** adresidir,
backend değil. Yanlış olursa basılmış QR kodları çalışmaz.

### IIS'te SPA yönlendirmesi

`frontend/public/web.config` (Vite bunu `dist/` içine kopyalar) var olmayan yolları
`index.html`'e yönlendirir. Bu dosya olmadan `/giris-yap` gibi adresleri doğrudan
açmak veya sayfayı yenilemek IIS'ten **404** döner.

> Bu web.config sır içermez ve depoda tutulur. Backend'in `web.config`'i ise
> üretilir ve sır taşır; o `.gitignore`'dadır.

### CORS

İki site farklı alan adında olduğu için tarayıcı bunu çapraz origin sayar.
Frontend adresi backend'in `Cors:AllowedOrigins` listesinde olmalıdır:

```
scripts\publish-monsterasp.ps1 -SiteHost mahmutapp.tryasp.net -FrontendOrigin https://sukranapp.runasp.net
```

`-FrontendOrigin` birden fazla değer alabilir. Origin başlığı şemayı da içerir;
`http://` ve `https://` **ayrı kaynaklardır**, biri listede diğeri değilse istek reddedilir.

### HTTPS

Her iki site için panelden ayrı ayrı açılır. Sertifikalar joker (`*.tryasp.net`,
`*.runasp.net`) ve MonsterASP tarafından otomatik yenilenir.

> Sertifika kesildikten sonra bağlamanın oturması **2-3 dakika** sürer. Hemen
> denerseniz TLS el sıkışması reddedilir; bu geçicidir, bir şey bozulmuş değildir.

### Oturum (refresh token)

Refresh token yanıt **gövdesinden** okunur, çerezden değil — farklı alan adları
sorun çıkarmaz. Sunucunun yazdığı `Secure; SameSite=Strict` çerez çapraz origin'de
kullanılmaz; frontend ona bakmaz.

## 5. HTTPS

- Uygulama production'da HSTS gönderir; sertifika olmadan yayına almayın.
- Ters vekil (nginx/IIS) kullanıyorsanız `X-Forwarded-For` ve `X-Forwarded-Proto`
  başlıklarını iletmelidir — kod bunları okumak üzere yapılandırılmıştır.
- Ücretsiz sertifika için Let's Encrypt (win-acme) kullanılabilir.

## 6. Yedekleme

`scripts/backup-database.ps1` tam yedek alır, `RESTORE VERIFYONLY` ile doğrular,
yüklenen görselleri zipler ve süresi dolmuş yedekleri siler.

```bash
powershell -File scripts\backup-database.ps1 -BackupPath "C:\Yedekler\sukran" -RetentionDays 30
```

Her gece 03:00'te çalışacak görev oluşturmak için:

```bash
schtasks /create /tn "Sukran DB Yedek" /tr "powershell -File C:\sukran\scripts\backup-database.ps1 -BackupPath C:\Yedekler\sukran" /sc daily /st 03:00 /ru SYSTEM
```

### Bilinmesi gereken iki tuzak (test edilerek doğrulandı)

1. **Yedeği SQL Server servis hesabı yazar, siz değil.** Hedef klasöre servis
   hesabının yazma izni yoksa `Operating system error 5` alırsınız:

   ```bash
   icacls "C:\Yedekler\sukran" /grant "NT Service\MSSQL$SQLEXPRESS:(OI)(CI)M"
   ```

2. **SQL Server Express sıkıştırmalı yedeği desteklemez.** Script sürümü tespit
   edip otomatik uyarlanır; Express'te yedekler sıkıştırılmadan alınır (daha büyük yer kaplar).

### Geri yükleme (felaket kurtarma)

```sql
RESTORE DATABASE [AppSukranDb] FROM DISK = N'C:\Yedekler\sukran\AppSukranDb-YYYYMMDD-HHMMSS.bak'
WITH REPLACE, RECOVERY;
```

> Yedeğin geri yüklenebilirliği düzenli olarak test edilmelidir. Test edilmemiş yedek,
> yedek sayılmaz.

## 7. Yayın sonrası kontrol

- [ ] `https://api.sukranapp.com/api/subscriptions/plans` paket listesini dönüyor
- [ ] Kayıt ol ekranından yeni bir işletme açılabiliyor, 14 günlük deneme başlıyor
- [ ] Bir masa ekleyip QR kodu indirin, **telefonla okutup** menünün açıldığını doğrulayın
- [ ] SuperAdmin ile giriş yapılıp abonelikler görülebiliyor
- [ ] Yedekleme görevi çalışıyor ve dosya oluşuyor

## 8. Henüz tamamlanmamış konular

- Başarısız tahsilatta müşteriye otomatik hatırlatma (e-posta/WhatsApp)
  gönderilmiyor; yalnızca panelde gösteriliyor.
- Şükran AI (Gemini asistanı) projeden **tamamen kaldırıldı** (kota sorunu).
- Fatura/kimlik numaraları veritabanında şifrelenmiyor (yalnızca maskeleniyor);
  bkz. 1.7.
- Restoran bazlı iyzico ayarları yok; iyzico anahtarları tüm platform için ortaktır.
- Sıfır otomatik test bulunuyor (bkz. proje yol haritası).
