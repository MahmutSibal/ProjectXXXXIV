# Şükran App

Şükran App, restoran ve işletmeler için masa, menü, adisyon, sipariş, ödeme ve
personel operasyonlarını tek panelde birleştiren full-stack bir uygulamadır.
Müşteriler masa üzerindeki QR kodu okutarak menüye ulaşabilir; işletme
personeli siparişleri, mutfak akışını ve ödemeleri yönetebilir.

> Bu depo aktif geliştirme ve dağıtım içindir. Production sırlarını (`.env`,
> bağlantı dizeleri, JWT anahtarları, ödeme anahtarları ve WhatsApp oturum
> dosyaları) Git'e eklemeyin.

## İçindekiler

- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Gereksinimler](#gereksinimler)
- [Projeyi çalıştırma](#projeyi-çalıştırma)
- [Ortam değişkenleri ve sırlar](#ortam-değişkenleri-ve-sırlar)
- [Veritabanı](#veritabanı)
- [Production dağıtımı](#production-dağıtımı)
- [Yardımcı betikler](#yardımcı-betikler)
- [Proje yapısı](#proje-yapısı)
- [Güvenlik notları](#güvenlik-notları)
- [Katkı ve lisans](#katkı-ve-lisans)

## Özellikler

- İşletme, kullanıcı ve personel yönetimi
- Rol tabanlı erişim: SuperAdmin, Owner, Garson ve Mutfak
- Masa ve QR kod yönetimi
- Müşteri menüsü ve masa üzerinden sipariş oluşturma
- Adisyon ve sipariş durumlarının canlı takibi
- Mutfak ekranı ve SignalR tabanlı gerçek zamanlı güncellemeler
- Nakit/havale ile personel tahsilatı
- Fake ödeme sağlayıcısı ile yerel test
- iyzico ile kartlı ödeme entegrasyonu
- WhatsApp üzerinden telefon doğrulama
- Denetim kayıtları ve yönetim ekranları
- ASP.NET Core API ve React/Vite web arayüzü

## Mimari

```text
Tarayıcı
   │
   ├── frontend/ veya / (React + Vite)
   │       ├── /api        ─────┐
   │       ├── /hubs       ─────┤ Vite proxy (geliştirme)
   │       └── /uploads    ─────┘
   │                            │
   ├── services/whatsapp/       │
   │       WhatsApp doğrulama   │ HTTP
   │                            ▼
   └────────────────────── backend/src/AppSukran.API
                              │
                              ├── SQL Server
                              └── MongoDB (kullanılan özelliklere göre)
```

Backend katmanları `Domain`, `Application`, `Infrastructure` ve `API` olarak
ayrılmıştır. `services/whatsapp`, Baileys kullanan bağımsız Node.js servisidir;
WhatsApp oturumunu backend'den ayrı tutar.

## Gereksinimler

- Windows, macOS veya Linux
- .NET SDK `10.0`
- Node.js `20+`
- npm
- SQL Server
- MongoDB (uygulamanın ilgili özellikleri için)
- WhatsApp doğrulaması kullanılacaksa internete erişebilen ayrı Node.js süreci

Sürümleri kontrol edin:

```powershell
dotnet --version
node --version
npm --version
```

## Projeyi çalıştırma

### 1. Depoyu klonlayın

```powershell
git clone https://github.com/MahmutSibal/ProjectXXXXIV.git
cd ProjectXXXXIV
```

### 2. Backend bağımlılıklarını kurun ve veritabanını hazırlayın

```powershell
cd backend
dotnet restore
dotnet ef database update --project src\AppSukran.Infrastructure --startup-project src\AppSukran.API
```

`dotnet ef` bulunamıyorsa:

```powershell
dotnet tool restore
```

### 3. Backend'i başlatın

```powershell
dotnet run --project src\AppSukran.API
```

API varsayılan geliştirme adresi olarak `http://localhost:5021` üzerinden
çalışacak şekilde yapılandırılmıştır. Swagger etkinse API belgeleri
`/swagger` adresinden açılabilir.

### 4. Frontend'i başlatın

Yeni bir terminal açın:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Vite tarafından verilen yerel adresi tarayıcıda açın. Geliştirme ortamında
`VITE_API_BASE_URL=/api` kullanılması önerilir; `vite.config.js` istekleri
backend'e yönlendirir.

### 5. WhatsApp servisini başlatın (isteğe bağlı)

Telefon doğrulaması kullanılacaksa:

```powershell
cd services\whatsapp
npm ci
Copy-Item .env.example .env
npm start
```

Servis `/status` endpoint'i üzerinden kontrol edilebilir. İlk çalıştırmada
WhatsApp oturumu için gereken QR kodu servis loglarında veya servis akışında
görülür.

### Tüm servisleri başlatma

Windows geliştirme ortamında aşağıdaki yardımcı betik kullanılabilir:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
```

## Ortam değişkenleri ve sırlar

Örnek dosyaları kopyalayarak başlayın:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item services\whatsapp\.env.example services\whatsapp\.env
```

Örnek dosyalar yalnızca isimleri ve güvenli varsayılanları gösterir. Gerçek
değerleri bu dosyalara yazabilirsiniz; `.gitignore` nedeniyle Git'e
eklenmezler. Production'da sunucu ortam değişkenlerini veya güvenli secret
store'u tercih edin.

### Backend için temel ayarlar

| Değişken | Açıklama |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | Geliştirmede `Development`, canlıda `Production` |
| `JWT_SIGNING_KEY` | En az 32 karakterlik rastgele imzalama anahtarı |
| `SUKRAN_DB_CONNECTION` | SQL Server bağlantı dizesi |
| `SUKRAN_SUPERADMIN_PASSWORD` | İlk SuperAdmin parolası |
| `SUKRAN_IYZICO_API_KEY` | iyzico API anahtarı |
| `SUKRAN_IYZICO_SECRET_KEY` | iyzico gizli anahtarı |
| `SUKRAN_WHATSAPP_TOKEN` | WhatsApp servisiyle ortak, en az 24 karakterlik token |

Ödeme sağlayıcısı geliştirmede `Fake`, canlıda `Iyzico` olarak ayarlanabilir.
iyzico sandbox ayarları ve ödeme kuralları için
[DEPLOYMENT.md](DEPLOYMENT.md) dosyasına bakın.

### Frontend ayarları

`frontend/.env.example`:

```env
VITE_API_BASE_URL=/api
VITE_PUBLIC_APP_URL=
```

Canlıda frontend ve API farklı alan adlarındaysa
`frontend/.env.production.example` içindeki `VITE_API_BASE_URL` değerini API'nin
HTTPS adresiyle değiştirin. `VITE_PUBLIC_APP_URL`, QR kodlarına gömülecek
müşteri frontend adresidir; backend adresi değildir.

### WhatsApp ayarları

`services/whatsapp/.env.example` dosyasındaki token, backend'deki
`SUKRAN_WHATSAPP_TOKEN` ile aynı olmalıdır. `tokens/` klasörü WhatsApp oturum
kimliğidir; depoya eklenmemeli ve çalışan production sunucusundan silinmemelidir.

## Veritabanı

Geliştirmede bağlantı ve varsayılan ayarlar:

- Backend: `backend/src/AppSukran.API/appsettings.Development.json`
- Production: ortam değişkenleri ve
  `backend/src/AppSukran.API/appsettings.Production.json`

Migration uygulamak için:

```powershell
cd backend
dotnet ef database update --project src\AppSukran.Infrastructure --startup-project src\AppSukran.API
```

Yedek almak ve yerel veritabanını sıfırlamak için:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-database.ps1
powershell -ExecutionPolicy Bypass -File scripts\reset-database.ps1
```

`reset-database.ps1` veri kaybına neden olabilir; yalnızca geliştirme
ortamında ve verilerin yedeği alındıktan sonra çalıştırın.

## Production dağıtımı

Production dağıtımının ayrıntılı, sağlayıcıya özel ve güncel adımları
[DEPLOYMENT.md](DEPLOYMENT.md) içinde tutulur. Bu dosya özellikle şunları
kapsar:

- Secret ve JWT yapılandırması
- iyzico sandbox/production ayarları
- reCAPTCHA yerine kullanılan hız sınırlama kuralları
- Vercel frontend + MonsterASP backend mimarisi
- WhatsApp Baileys servisinin IIS üzerinde çalıştırılması
- `web.config`, `tokens/` ve `logs/` klasörleri için yayınlama uyarıları
- ngrok ile geçici geliştirme erişimi

Backend yayınlama:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\publish-monsterasp.ps1
```

WhatsApp servis yayınlama:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\publish-whatsapp.ps1
```

Canlıya almadan önce:

- [ ] Production secret'ları Git geçmişinde bulunmuyor
- [ ] `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Güçlü ve benzersiz `JWT_SIGNING_KEY` tanımlı
- [ ] SQL Server ve MongoDB bağlantıları doğrulandı
- [ ] CORS yalnızca gerçek frontend alan adlarına açık
- [ ] Frontend API adresi HTTPS kullanıyor
- [ ] iyzico production anahtarları ve callback adresleri test edildi
- [ ] WhatsApp token'ı backend ve servis arasında aynı
- [ ] QR kodlarında kullanılan frontend alan adı kesinleşti
- [ ] `tokens/` ve `logs/` klasörleri deploy sırasında korunuyor

## Yardımcı betikler

| Betik | Amaç |
|---|---|
| `scripts/start-all.ps1` | Yerel servisleri birlikte başlatır |
| `scripts/backup-database.ps1` | Veritabanı yedeği alır |
| `scripts/reset-database.ps1` | Geliştirme veritabanını sıfırlar |
| `scripts/publish-monsterasp.ps1` | Backend yayın çıktısı üretir |
| `scripts/publish-whatsapp.ps1` | WhatsApp servisi yayın çıktısı üretir |

## Test, lint ve build

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Alternatif frontend için aynı komutları `Yeni_Frontend` klasöründe çalıştırın.

Backend:

```powershell
cd backend
dotnet build AppSukran.slnx
dotnet test AppSukran.slnx
```

Test hesabı veya API isteği kullanırken gerçek müşteri verileri ve production
anahtarları kullanmayın. Depoda bulunan `test_login.json` ve
`test_register.json` dosyaları yalnızca yerel test akışını anlamak içindir.

## Proje yapısı

```text
.
├── backend/
│   ├── AppSukran.slnx
│   └── src/
│       ├── AppSukran.API/
│       ├── AppSukran.Application/
│       ├── AppSukran.Domain/
│       └── AppSukran.Infrastructure/
├── frontend/
├── Yeni_Frontend/
├── services/
│   └── whatsapp/
├── scripts/
├── izyco/
├── DEPLOYMENT.md
└── .gitignore
```

`publish/`, `publish-whatsapp/`, `logs/`, `node_modules/`, `bin/`, `obj/`,
`.vs/`, `dist/` ve gerçek `.env` dosyaları çalışma/deploy çıktılarıdır; kaynak
kod deposunda tutulmazlar.

## Güvenlik notları

- Secret'ları commit etmeyin; örnek dosyalara yalnızca placeholder yazın.
- Bir secret yanlışlıkla Git'e girdiyse yalnızca dosyayı silmek yeterli değildir:
  anahtarı sağlayıcı panelinden hemen yenileyin ve Git geçmişini temizleyin.
- Production'da varsayılan veya kısa JWT anahtarı kullanmayın.
- Production API ve frontend için HTTPS zorunludur.
- CORS'u `*` yapmayın; gerçek frontend origin'lerini açıkça tanımlayın.
- WhatsApp `tokens/` klasörü hesap oturumuna erişim sağlayabilir; yedeklerini
  erişim kontrollü saklayın.
- Ödeme kart bilgilerini uygulama loglarına veya veritabanına yazmayın.

## Katkı ve lisans

Değişiklik göndermeden önce ilgili frontend lint/build ve backend build/test
komutlarını çalıştırın. Büyük özelliklerde önce issue açıp kapsamı netleştirin;
küçük düzeltmeler doğrudan pull request olarak gönderilebilir.

Bu depoda ayrıca bir lisans dosyası bulunmadığı için, açık kaynak kullanım
hakları için proje sahibiyle iletişime geçin.

