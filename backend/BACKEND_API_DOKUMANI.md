# AppSukran Backend Detayli Dokumani

Bu dokuman, backend kodunu inceleyerek hazirlanmistir ve iki amaca odaklanir:
- Projenin ne oldugunu ve nasil kurgulandigini aciklamak
- Tum endpointleri ve endpointlerin ne istedigini (path/query/body, yetki, temel kurallar) listelemek

## 1) Proje Nedir?

AppSukran backend, restoran masasi/siparis/hesap odakli bir API katmanidir. Sistem; QR oturumu, kullanici kimlik dogrulama (JWT + refresh token), siparis yonetimi, hesap (bill) yonetimi, parcali odeme ve restoran/menu yonetimi senaryolarini kapsar.

### Temel teknik yapi
- Mimari: Katmanli yapi (API, Application, Domain, Infrastructure)
- API: ASP.NET Core Web API + Controller tabanli
- Is kurallari ve use-case: MediatR Command/Query yapisi
- Validation: FluentValidation pipeline
- Veri katmani: MongoDB (MongoClient + generic repository + unit of work)
- Kimlik dogrulama: JWT Bearer
- Yetkilendirme:
  - Rol bazli (`SuperAdmin`, `RestaurantOwner`, vb.)
  - Politika bazli (`SuperAdminOnly`)
- Gercek zamanli iletisim: SignalR (`/hubs/orders`)
- Koruma:
  - CORS policy (development ortaminda genis, productionda kisitli)
  - Rate limiting (orders-write, payments-write)

### Dikkat edilmesi gereken genel noktalar
- JWT signing key, ortama gore `JWT_SIGNING_KEY` env var ile override edilebiliyor.
- Refresh token server tarafinda `appsukran_refresh` adli HttpOnly cookie ile de yonetiliyor.
- Enum alanlari yanitlarda **sayisal (int)** doner. Istek gonderirken hem sayisal (`1`) hem string (`"Pending"`) deger kabul edilir (System.Text.Json varsayilani). Istemciler (Flutter + web) enum yanitlarini sayisal okur; sayisal gondermek en guvenlisidir.

## 2) Ortak Kurallar

### Base URL ve route kalibi
- Controller route kalibi genelde: `api/[controller]`
- Ornek: `AuthController` => `api/auth`

### Auth tipleri
- Acik endpointler: `AuthController`, bazi restoran/menu/public GET endpointleri
- JWT zorunlu endpointler: `Orders`, `Bills`, `Payments`, `Users`
- Rol kisiti olan endpointler:
  - `Users`: SuperAdmin policy
  - `Restaurants` POST: SuperAdmin
  - `MenuItems` POST/PUT/DELETE: RestaurantOwner
  - `RestaurantTables`: SuperAdmin veya RestaurantOwner

### Rate limit
- `OrdersController` ve `BillsController`: `orders-write`
  - Dakikada 30 istek, kuyruk 10
- `PaymentsController`: `payments-write`
  - Dakikada 20 istek, kuyruk 10

## 3) Enum Degerleri (isteklerde kullanilan)

### UserRole
- 1: SuperAdmin
- 2: RestaurantOwner
- 4: Customer

### OrderSessionStatus
- 1: Active
- 2: Closed

### OrderItemStatus
- 1: Pending
- 2: Kitchen
- 3: Preparing
- 4: Ready
- 5: Delivered

### PaymentStatus
- 1: Unpaid
- 2: Processing
- 3: Paid

## 4) Endpoint Listesi ve Istedikleri

Asagida her endpoint icin su format kullanilir:
- Route
- Method
- Yetki
- Path/Query parametreleri
- Body (istenen alanlar)
- Temel validasyon kurallari
- Beklenen sonuc tipi (genel)

---

## 4.1 Auth (`/api/auth`)

### 1. QR Session olustur
- Route: `/api/auth/qr-session`
- Method: `POST`
- Yetki: Acik
- Body:
  - `restaurantId` (string)
  - `tableNo` (int)
  - `qrToken` (string)
- Validasyon:
  - `restaurantId` bos olamaz
  - `tableNo` > 0
  - `qrToken` bos olamaz
- Donus:
  - `QrSessionResponse`:
    - `accessToken`
    - `expiresAt`
    - `restaurantId`
    - `tableNo`
    - `tableSessionId`

### 2. Kayit ol
- Route: `/api/auth/register`
- Method: `POST`
- Yetki: Acik
- Body:
  - `name` (string)
  - `email` (string)
  - `password` (string)
  - `role` (UserRole)
  - `restaurantId` (string, opsiyonel ama role'e gore zorunlu)
- Validasyon:
  - `name`: bos olamaz, max 150
  - `email`: bos olamaz, email format, max 250
  - `password`: bos olamaz, min 8 max 200
  - `role`: SuperAdmin olamaz
    - `role` RestaurantOwner ise `restaurantId` zorunlu
- Donus:
  - `TokenResponse` (`accessToken`, `refreshToken`, `refreshTokenExpiresAt`)
  - Ayrica HttpOnly refresh cookie set edilir (`appsukran_refresh`)

### 3. Giris yap
- Route: `/api/auth/login`
- Method: `POST`
- Yetki: Acik
- Body:
  - `email` (string)
  - `password` (string)
- Validasyon:
  - `email`: bos olamaz, email format
  - `password`: bos olamaz
- Donus:
  - `TokenResponse`
  - HttpOnly refresh cookie set edilir

### 4. Token yenile
- Route: `/api/auth/refresh`
- Method: `POST`
- Yetki: Acik
- Body:
  - `refreshToken` (string, bos gelirse cookie'den okunmaya calisilir)
- Validasyon:
  - refresh token bos olamaz
- Donus:
  - `TokenResponse`
  - refresh cookie rotate edilir

### 5. Cikis yap
- Route: `/api/auth/logout`
- Method: `POST`
- Yetki: Acik
- Body:
  - `refreshToken` (opsiyonel, yoksa cookie'den okunur)
- Islem:
  - Token varsa revoke komutu cagrilir
  - `appsukran_refresh` cookie temizlenir
- Donus:
  - `204 No Content`

---

## 4.2 Users (`/api/users`)

Not: Tum endpointler `SuperAdminOnly` policy ister.

### 1. Kullanicinin rolunu guncelle
- Route: `/api/users/{userId}/role`
- Method: `PUT`
- Yetki: SuperAdminOnly
- Path:
  - `userId` (string)
- Body:
  - `role` (UserRole)
  - `restaurantId` (string, role'e gore gerekli)
- Validasyon:
  - `userId` bos olamaz
  - `role` enum icinde olmali
    - `role` RestaurantOwner ise `restaurantId` zorunlu
- Donus:
  - `204 No Content`

### 2. Kullanici sifresini resetle
- Route: `/api/users/{userId}/reset-password`
- Method: `PUT`
- Yetki: SuperAdminOnly
- Path:
  - `userId` (string)
- Body:
  - `newPassword` (string)
- Validasyon:
  - `userId` bos olamaz
  - `newPassword` bos olamaz, min 8 max 200
- Donus:
  - `204 No Content`

---

## 4.3 Restaurants (`/api/restaurants`)

### 1. Yakindaki restoranlari getir
- Route: `/api/restaurants/nearby`
- Method: `GET`
- Yetki: Acik
- Query:
  - `longitude` (double)
  - `latitude` (double)
  - `maxDistanceMeters` (int, varsayilan 5000)
- Donus:
  - `NearbyRestaurantDto[]`:
    - `id`, `slug`, `name`, `address`, `longitude`, `latitude`, `distanceMeters`

### 2. ID ile restoran detayi
- Route: `/api/restaurants/{restaurantId}`
- Method: `GET`
- Yetki: Acik
- Path:
  - `restaurantId` (string)
- Donus:
  - `RestaurantDetailResponse` veya `404`

### 3. Slug ile restoran detayi
- Route: `/api/restaurants/by-slug/{slug}`
- Method: `GET`
- Yetki: Acik
- Path:
  - `slug` (string)
- Donus:
  - `RestaurantDetailResponse` veya `404`

### 4. Masa session dogrulama
- Route: `/api/restaurants/{restaurantId}/tables/{tableNo}/session`
- Method: `GET`
- Yetki: Acik
- Path:
  - `restaurantId` (string)
  - `tableNo` (int)
- Query:
  - `token` (string)
- Donus:
  - `RestaurantTableSessionDto` veya `404`

### 5. Restoran olustur
- Route: `/api/restaurants`
- Method: `POST`
- Yetki: Sadece SuperAdmin
- Body:
  - `name` (string)
  - `slug` (string)
  - `ownerId` (string)
  - `longitude` (double)
  - `latitude` (double)
  - `address` (string)
- Donus:
  - `{ restaurantId: string }`

---

## 4.4 Restaurant Tables (`/api/restaurants/{restaurantId}/tables`)

Not: Tum endpointler `SuperAdmin,RestaurantOwner` rollerini ister.

### 1. Masa session ac
- Route: `/api/restaurants/{restaurantId}/tables/{tableNo}/session/open`
- Method: `POST`
- Yetki: SuperAdmin veya RestaurantOwner
- Path:
  - `restaurantId` (string)
  - `tableNo` (int)
- Body: Yok
- Donus:
  - `RestaurantTableSessionDto`

### 2. Masa session kapat
- Route: `/api/restaurants/{restaurantId}/tables/{tableNo}/session/close`
- Method: `POST`
- Yetki: SuperAdmin veya RestaurantOwner
- Path:
  - `restaurantId` (string)
  - `tableNo` (int)
- Body: Yok
- Donus:
  - `RestaurantTableSessionDto`

---

## 4.5 Menu Items (`/api/menuitems`)

### 1. Menu item getir (ID)
- Route: `/api/menuitems/{menuItemId}`
- Method: `GET`
- Yetki: Acik
- Path:
  - `menuItemId` (string)
- Donus:
  - `MenuItemResponse` veya null

### 2. Restorana ait menu itemler
- Route: `/api/menuitems/restaurant/{restaurantId}`
- Method: `GET`
- Yetki: Acik
- Path:
  - `restaurantId` (string)
- Donus:
  - `MenuItemResponse[]`

### 3. Menu item olustur
- Route: `/api/menuitems`
- Method: `POST`
- Yetki: RestaurantOwner
- Body:
  - `restaurantId` (string)
  - `category` (string)
  - `name` (string)
  - `imageUrl` (string)
  - `ingredients` (string[])
  - `recipe` (string, nullable)
  - `averagePreparationTime` (int)
  - `price` (long)
  - `isAvailable` (bool)
- Validasyon:
  - `restaurantId` bos olamaz
  - `category` bos olamaz, max 100
  - `name` bos olamaz, max 200
  - `imageUrl` bos olamaz, max 500
  - `averagePreparationTime` >= 0
  - `price` >= 0
- Donus:
  - Olusan kaydin id'si (string)

### 4. Menu item guncelle
- Route: `/api/menuitems/{menuItemId}`
- Method: `PUT`
- Yetki: RestaurantOwner
- Path:
  - `menuItemId` (string)
- Body:
  - `category` (string)
  - `name` (string)
  - `imageUrl` (string)
  - `ingredients` (string[])
  - `recipe` (string, nullable)
  - `averagePreparationTime` (int)
  - `price` (long)
  - `isAvailable` (bool)
- Validasyon:
  - `menuItemId` bos olamaz
  - `category` bos olamaz, max 100
  - `name` bos olamaz, max 200
  - `imageUrl` bos olamaz, max 500
  - `averagePreparationTime` >= 0
  - `price` >= 0
- Donus:
  - `204 No Content`

### 5. Menu item sil
- Route: `/api/menuitems/{menuItemId}`
- Method: `DELETE`
- Yetki: RestaurantOwner
- Path:
  - `menuItemId` (string)
- Donus:
  - `204 No Content`

---

## 4.6 Orders (`/api/orders`)

Not: Controller seviyesinde JWT zorunlu + `orders-write` rate limit.

### 1. Siparis getir (ID)
- Route: `/api/orders/{orderId}`
- Method: `GET`
- Yetki: JWT
- Path:
  - `orderId` (string)
- Donus:
  - `OrderResponse` veya null

### 2. Restorana ait siparisler
- Route: `/api/orders/restaurant/{restaurantId}`
- Method: `GET`
- Yetki: JWT
- Path:
  - `restaurantId` (string)
- Donus:
  - `OrderResponse[]`

### 3. Siparis olustur
- Route: `/api/orders`
- Method: `POST`
- Yetki: JWT
- Body:
  - `restaurantId` (string)
  - `tableNo` (int)
  - `tableSessionId` (string)
  - `qrToken` (string)
  - `items` (array)
    - her item:
      - `menuItemId` (string)
      - `name` (string)
      - `price` (long)
      - `orderedBy` (string)
      - `status` (OrderItemStatus)
      - `paymentStatus` (PaymentStatus)
- Validasyon:
  - `restaurantId` bos olamaz
  - `tableNo` > 0
  - `tableSessionId` bos olamaz
  - `qrToken` bos olamaz
  - `items` bos/null olamaz, en az 1 item olmali
- Donus:
  - Olusan siparis id'si (string)

### 4. Siparis session status guncelle
- Route: `/api/orders/{orderId}/status`
- Method: `PUT`
- Yetki: JWT
- Path:
  - `orderId` (string)
- Body:
  - `sessionStatus` (OrderSessionStatus)
- Donus:
  - `204 No Content`

### 5. Siparis sil
- Route: `/api/orders/{orderId}`
- Method: `DELETE`
- Yetki: JWT
- Path:
  - `orderId` (string)
- Donus:
  - `204 No Content`

### 6. Siparis item status guncelle
- Route: `/api/orders/{orderId}/items/{orderItemId}/status`
- Method: `PUT`
- Yetki: JWT
- Path:
  - `orderId` (string)
  - `orderItemId` (string)
- Body:
  - `status` (OrderItemStatus)
- Donus:
  - `204 No Content`

---

## 4.7 Bills (`/api/bills`)

Not: Controller seviyesinde JWT zorunlu + `orders-write` rate limit.

### 1. Hesap getir (ID)
- Route: `/api/bills/{billId}`
- Method: `GET`
- Yetki: JWT
- Path:
  - `billId` (string)
- Donus:
  - `BillResponse` veya null

### 2. Restorana ait hesaplar
- Route: `/api/bills/restaurant/{restaurantId}`
- Method: `GET`
- Yetki: JWT
- Path:
  - `restaurantId` (string)
- Donus:
  - `BillResponse[]`

### 3. Hesap olustur
- Route: `/api/bills`
- Method: `POST`
- Yetki: JWT
- Body:
  - `restaurantId` (string)
  - `tableNo` (int)
  - `tableSessionId` (string)
  - `qrToken` (string)
  - `items` (array)
    - her item:
      - `menuItemId` (string)
      - `name` (string)
      - `price` (long)
      - `orderedBy` (string)
      - `status` (OrderItemStatus)
      - `paymentStatus` (PaymentStatus)
- Validasyon:
  - `restaurantId` bos olamaz
  - `tableNo` > 0
  - `tableSessionId` bos olamaz
  - `qrToken` bos olamaz
  - `items` bos/null olamaz, en az 1 item olmali
- Donus:
  - Olusan bill id'si (string)

### 4. Hesap guncelle
- Route: `/api/bills/{billId}`
- Method: `PUT`
- Yetki: JWT
- Path:
  - `billId` (string)
- Body:
  - `sessionStatus` (OrderSessionStatus)
  - `remainingAmount` (long)
- Donus:
  - `204 No Content`

### 5. Hesap sil
- Route: `/api/bills/{billId}`
- Method: `DELETE`
- Yetki: JWT
- Path:
  - `billId` (string)
- Donus:
  - `204 No Content`

### 6. Bill item status guncelle
- Route: `/api/bills/{billId}/items/{orderItemId}/status`
- Method: `PUT`
- Yetki: JWT
- Path:
  - `billId` (string)
  - `orderItemId` (string)
- Body:
  - `status` (OrderItemStatus)
- Donus:
  - `204 No Content`

---

## 4.8 Customer Cards (`/api/customercards`)

Not: Controller seviyesinde JWT zorunlu + müşteri rolü gerekir.

### 1. Kendi kartlarini getir
- Route: `/api/customercards/me`
- Method: `GET`
- Yetki: Customer
- Donus:
  - `CustomerCardResponse[]`

### 2. Kart ekle
- Route: `/api/customercards`
- Method: `POST`
- Yetki: Customer
- Body:
  - `cardholderName` (string)
  - `cardNumber` (string)
  - `expiryMonth` (int)
  - `expiryYear` (int)
  - `cvv` (string)
  - `isDefault` (bool, opsiyonel)
- Validasyon:
  - `cardholderName` bos olamaz
  - `cardNumber` bos olamaz, Luhn dogrulamasi gecerli olmali
  - `expiryMonth` 1..12 olmalı
  - `expiryYear` mevcut/past olmayan yil olmali
  - `cvv` bos olamaz, 3-4 hane olmali
- Donus:
  - `CustomerCardResponse`

### 3. Kart dogrula
- Route: `/api/customercards/verify`
- Method: `POST`
- Yetki: Customer
- Body:
  - `customerCardId` (string)
  - `cardNumber` (string)
- Donus:
  - `CustomerCardVerificationResponse`

### 4. Kart sil
- Route: `/api/customercards/{customerCardId}`
- Method: `DELETE`
- Yetki: Customer
- Path:
  - `customerCardId` (string)
- Donus:
  - `204 No Content`

---

## 4.9 Payments (`/api/payments`)

Not: Controller seviyesinde JWT zorunlu + `payments-write` rate limit.

### 1. Secili urunleri ode
- Route: `/api/payments/specific-items`
- Method: `POST`
- Yetki: JWT
- Body:
  - `billId` (string)
  - `itemIds` (string[])
  - `paidByUserId` (string)
  - `customerCardId` (string, opsiyonel)
  - `cardNumber` (string, opsiyonel; cardId verildiğinde gerekli)
- Validasyon:
  - `billId` bos olamaz
  - `paidByUserId` bos olamaz
  - `itemIds` bos/null olamaz, en az 1 oge olmali
- Donus:
  - Komut sonucu `200 OK` ile doner

### 2. Hesabi esit bol
- Route: `/api/payments/split-equally`
- Method: `POST`
- Yetki: JWT
- Body:
  - `billId` (string)
  - `personCount` (int)
  - `paidByUserId` (string)
  - `customerCardId` (string, opsiyonel)
  - `cardNumber` (string, opsiyonel; cardId verildiğinde gerekli)
- Validasyon:
  - `billId` bos olamaz
  - `paidByUserId` bos olamaz
  - `personCount` > 0 ve <= 100
- Donus:
  - Komut sonucu `200 OK` ile doner

### 3. Ozel tutar ode
- Route: `/api/payments/custom-amount`
- Method: `POST`
- Yetki: JWT
- Body:
  - `billId` (string)
  - `amount` (long)
  - `paidByUserId` (string)
  - `customerCardId` (string, opsiyonel)
  - `cardNumber` (string, opsiyonel; cardId verildiğinde gerekli)
- Validasyon:
  - `billId` bos olamaz
  - `paidByUserId` bos olamaz
  - `amount` > 0
- Donus:
  - Komut sonucu `200 OK` ile doner

Not (kart ile odeme): Uc odeme endpointinde kart gonderildiginde tahsilat isletmenin KENDI
iyzico hesabina gider. Isletme online odemeyi acmadiysa `400` doner:
"Bu isletme online kart ödemesi almıyor." Kartsiz (nakit) personel akisi etkilenmez.

---

## 4.11 Odeme ayarlari (havale bilgileri ve isletme online odemesi)

Platform isletmelerin cirosunu tahsil etmez. Abonelik ucreti havale/EFT ile platformun banka
hesabina yatirilir; masa odemeleri ise isletmenin kendi iyzico hesabina gider.
JSON alanlari camelCase'dir.

### 1. Platform havale bilgilerini getir (isletme ve herkese acik site)
- Route: `/api/platform-settings/payment`
- Method: `GET`
- Yetki: Acik (AllowAnonymous)
- Donus `200`:
  - `bankName`, `accountHolder`, `iban`, `branch`, `paymentNote` (hepsi string)
  - `iban` 4'lu gruplar halinde doner (`TR12 3456 ...`)
  - `isConfigured` (bool), `bankTransferEnabled` (bool)
  - Havale/EFT KAPALIYSA (veya kayit/IBAN yoksa) tum banka alanlari bos string doner,
    `isConfigured=false`, `bankTransferEnabled=false`; banka bilgisi hic sizmaz
  - Acik ve IBAN doluysa tam bilgi, `isConfigured=true`, `bankTransferEnabled=true`

### 1a. Platform havale bilgilerini getir (yonetim)
- Route: `/api/platform-settings/payment/admin`
- Method: `GET`
- Yetki: SuperAdmin
- Donus `200`: ayni alanlar; kayitli degerler anahtardan bagimsiz doner
  - `isConfigured` = iban dolu; `bankTransferEnabled` = kayitli bayrak (kayit yoksa `false`)

### 2. Platform havale bilgilerini guncelle
- Route: `/api/platform-settings/payment`
- Method: `PUT`
- Yetki: SuperAdmin
- Body: `bankName`, `accountHolder`, `iban`, `branch`, `paymentNote`, `bankTransferEnabled` (bool)
- Kurallar:
  - Tum alanlar trim edilir; IBAN bosluksuz/buyuk harfle saklanir
  - IBAN doluysa Turkiye IBAN'i olmali (`TR` + 24 hane, mod-97 saglamasi), `bankName` ve `accountHolder` zorunlu
  - `bankTransferEnabled=true` iken IBAN bos ise `400`: "Havale/EFT'yi açmak için banka bilgilerini girin."
  - `bankTransferEnabled` gonderilmezse IBAN doluysa acik, bossa kapali sayilir (geriye uyumlu)
  - Kapatmak (`false`) kayitli banka bilgilerini SILMEZ (sonra tekrar acilabilir); kapatirken tum alanlar
    bos gonderilirse mevcut bilgilere dokunulmaz. Alan gonderilmeden hepsi bos gelirse bilgiler temizlenir
  - Uzunluk sinirlari: banka 100, hesap sahibi 150, sube 100, aciklama 500
- Donus: `204 No Content` (denetim kaydi yazilir, acildi/kapatildi belirtilir; IBAN yalnizca maskeli)

### 2a. Odeme altyapisi ayarlarini getir (herkese acik)
- Route: `/api/platform-settings/payment-options`
- Method: `GET`
- Yetki: Acik (AllowAnonymous)
- Donus `200`: `{ "showIyzicoLogos": bool, "cardPaymentsEnabled": bool }`
  - `showIyzicoLogos`: web sitesinde iyzico logo bandi gosterilsin mi
  - `cardPaymentsEnabled`: platform genelinde online KART odemesi ana anahtari (masada misafir odemesi)
  - Kayit yoksa ikisi de `true`; ASLA hata firlatmaz, herhangi bir hatada yine ikisi de `true` doner

### 2b. Odeme altyapisi ayarlarini guncelle
- Route: `/api/platform-settings/payment-options`
- Method: `PUT`
- Yetki: SuperAdmin
- Body: `{ "showIyzicoLogos": bool, "cardPaymentsEnabled": bool }`
- Kurallar:
  - Tek satirlik ayar kaydi yoksa olusturulur (banka alanlari bos, `bankTransferEnabled=false`)
  - Banka alanlarina ASLA dokunmaz; ters yonde `PUT /api/platform-settings/payment` de bu iki bayragi sifirlamaz (korur)
    ve yeni satir olusturursa ikisi `true` baslar. Banka GET yanitlari degismemistir
- Donus: `204 No Content`; denetim kaydi "Ödeme altyapısı ayarları güncellendi" (iki deger detayda yazilir)

### 3. Isletme online odeme ayarlarini getir
- Route: `/api/restaurants/{restaurantId}/payment-settings`
- Method: `GET`
- Yetki: RestaurantOwner (kendi restorani) veya SuperAdmin
- Donus `200`:
  - `onlinePaymentEnabled` (bool), `provider` (`"iyzico"`)
  - `hasCredentials` (bool), `apiKeyMasked` (ornek `sand••••3f`), `baseUrl`
  - `globalProviderIsFake` (bool; platform odemesi simulasyonda mi)
  - `cardPaymentsAllowedByPlatform` (bool): platform genel kart ana anahtari (`cardPaymentsEnabled`); kayit yoksa `true`.
    `false` ise isletme ayari acik olsa bile kart tahsilati yapilmaz (sahip sayfasi bunu aciklar)
  - API anahtarinin tamami ve gizli anahtar ASLA donmez

### 4. Isletme online odeme ayarlarini guncelle
- Route: `/api/restaurants/{restaurantId}/payment-settings`
- Method: `PUT`
- Yetki: RestaurantOwner (kendi restorani) veya SuperAdmin
- Body: `onlinePaymentEnabled` (bool), `apiKey`, `secretKey`, `baseUrl` (string, null/bos = mevcut deger korunur)
- Kurallar:
  - `baseUrl` yalnizca `https://api.iyzipay.com` veya `https://sandbox-api.iyzipay.com`; hic secilmediyse `Payment:Iyzico:BaseUrl`
  - `onlinePaymentEnabled=true` iken platform saglayicisi Fake DEGILSE iki anahtar da (birlestirme sonrasi) bulunmali, yoksa `400`
  - Platform saglayicisi Fake ise anahtarsiz acmak serbesttir (simulasyon)
  - Anahtarlar sifreli saklanir; denetim kaydina anahtar yazilmaz
- Donus: `204 No Content`

### 5. Isletme online odeme acik mi (musteri / QR menusu)
- Route: `/api/restaurants/{restaurantId}/online-payment`
- Method: `GET`
- Yetki: Acik (AllowAnonymous)
- Donus `200`: `{ "enabled": bool }`
  - `enabled` = ayar satiri var && `onlinePaymentEnabled` && (anahtarlar var || platform saglayicisi Fake)
  - Ayar satiri olmayan isletmede `false` (opt-in)
  - Platform ana anahtari kapaliysa (`cardPaymentsEnabled=false`) isletme ayarindan bagimsiz olarak her zaman `false`
  - Ana anahtar kapaliyken QR musterisi kart ile odemeye calisirsa (PayCustomAmount / PaySpecificItems / SplitEqually,
    kart bilgisi gonderildiginde) `400`: "Online kart ödemesi şu anda kapalı." Personelin kartsiz nakit kaydi ve
    abonelik akislari (platform geciti) etkilenmez

### 6. Platform bakim modu durumu (herkese acik)
- Route: `/api/platform-settings/status`
- Method: `GET`
- Yetki: Acik (AllowAnonymous)
- Donus `200`: `{ "maintenanceEnabled": bool, "message": string, "serverDisabled": bool }`
  - Kayit yoksa `maintenanceEnabled=false`, `message=""`, `serverDisabled=false`
  - Ucuz bir okumadir ve ASLA hata firlatmaz; okuma basarisiz olursa (ornegin tablo henuz yoksa) yine
    `{ "maintenanceEnabled": false, "message": "", "serverDisabled": false }` doner
  - Sunucu kapaliyken (asagida) bu uc yine herkese acik kalir; on yuz kapali durumu buradan ogrenir

### 7. Platform bakim modunu guncelle
- Route: `/api/platform-settings/status`
- Method: `PUT`
- Yetki: SuperAdmin
- Body: `{ "maintenanceEnabled": bool, "message": string, "serverDisabled": bool? }`
- Kurallar:
  - `message` trim edilir; en fazla 300 karakter, asarsa `400`: "Bakım mesajı en fazla 300 karakter olabilir."
  - Bos mesaj serbesttir
  - `serverDisabled` OPSIYONELDIR (geriye uyumluluk): eski on yuz yalnizca `maintenanceEnabled` ve
    `message` gonderir; alan yoksa (`null`) kayitli deger KORUNUR. Gonderilirse deger olarak uygulanir
- Donus: `204 No Content`; denetim kaydi yazilir ("Bakım modu açıldı" / "Bakım modu kapatıldı").
  `serverDisabled` degistiyse ayrica "Sunucu kapatıldı" / "Sunucu açıldı" kaydi yazilir

Onemli: `maintenanceEnabled` (bakim modu) yalnizca bir DUYURUDUR. Sunucu tarafinda hicbir istegi
engellemez; bakim ekranini gostermek ve SuperAdmin'i bunun disinda tutmak on yuzun sorumlulugundadir.

**Sunucu kapatma (yazilimsal, `serverDisabled`)** — IIS sureci DURDURULMAZ (kimse geri baslatamazdi);
bayrak acikken `ServerShutdownMiddleware` istekleri reddeder:
- SuperAdmin DISINDAKI her istek `503 Service Unavailable` doner, `Retry-After: 60`,
  `Content-Type: application/json`, govde:
  `{"type":"about:blank","title":"Sunucu kapalı","status":503,"errors":["Sunucu şu anda kapalı."]}`
- SuperAdmin her zaman gecer (SignalR `/hubs/orders` dahil; token `access_token` sorgu parametresiyle
  gelse de kimlik dogrulamadan sonra degerlendirilir)
- Izin listesi (kapaliyken de erisilebilir, buyuk/kucuk harf duyarsiz): `OPTIONS` istekleri (CORS preflight),
  `/api/health`, `/api/health/ready`, `GET /api/platform-settings/status`, `POST /api/auth/login`,
  `/api/auth/refresh`, `/api/auth/logout`. Bunlarin disindaki her sey engellenir
- Middleware sirasi: CORS -> rate limiter -> `UseAuthentication` -> **ServerShutdownMiddleware** ->
  `UseAuthorization` -> controller/hub. Bu nedenle anonim istek 401 degil 503 alir
- Bayrak ~5 sn bellekte onbelleklenir; `PUT /api/platform-settings/status` kaydedince bu instance'ta
  onbellek aninda dusurulur (birden cok instance varsa digerleri en gec ~5 sn sonra gorur)
- Bayrak okunamazsa FAIL-OPEN: istek gecirilir ve uyari loglanir
- Yeni sutun: `MaintenanceSettings.ServerDisabled` (bit, varsayilan `0`; migration `AddServerShutdown`)
- SuperAdmin giris yapamiyorsa yeniden acmak icin: `UPDATE MaintenanceSettings SET ServerDisabled = 0`
  (saglik ve auth uclari kapaliyken de erisilebilir kalir; onbellek en gec ~5 sn icinde yenilenir,
  gerekirse uygulamayi yeniden baslatin)

---

## 4.10 Products (`/api/products`)

### 1. Tum urunleri getir
- Route: `/api/products`
- Method: `GET`
- Yetki: Acik
- Body: Yok
- Donus:
  - Product listesi

### 2. Urun getir (ID)
- Route: `/api/products/{id}`
- Method: `GET`
- Yetki: Acik
- Path:
  - `id` (int)
- Donus:
  - Product veya `404`

### 3. Urun olustur
- Route: `/api/products`
- Method: `POST`
- Yetki: Acik
- Body:
  - `name` (string)
  - `price` (decimal)
- Controller seviyesinde ek kontrol:
  - `name` bos olamaz
  - `price` > 0 olmali
- Donus:
  - `201 Created`

---

## 4.10 WeatherForecast (`/weatherforecast`)

Bu endpoint standart ASP.NET template endpointidir.

### 1. Hava tahmini
- Route: `/weatherforecast`
- Method: `GET`
- Yetki: Acik
- Donus:
  - Ornek hava tahmini listesi

---

## 5) Realtime Endpoint

### SignalR Hub
- Route: `/hubs/orders`
- Hub methodlari:
  - `JoinRestaurantGroup(restaurantId)`
  - `LeaveRestaurantGroup(restaurantId)`

Bu kanal, restoran bazli gercek zamanli siparis olaylari icin kullanilmaya uygun sekilde kurgulanmis.

## 6) Kisa Sonuc

Bu backend; restoran operasyonunu uc ana eksende yoneten bir API'dir:
- Kimlik + session (Auth, Users)
- Operasyon (Restaurant, Menu, Order, Bill)
- Tahsilat (Payments)

Dokuman endpoint seviyesinde hangi alanlarin zorunlu oldugunu ve hangi kosullarda calistigini netlestirir; frontend/mobil ekipleri dogrudan bu dosyayi kontrat referansi olarak kullanabilir.
