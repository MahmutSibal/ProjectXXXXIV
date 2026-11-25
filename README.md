# Şükran App

Şükran App; restoranların işletme, masa, menü, sipariş, adisyon, ödeme ve personel süreçlerini tek bir panelden yönetmesi için geliştirilen full-stack bir uygulamadır. Müşteriler masadaki QR koduyla dijital menüye ulaşabilir; personel siparişleri ve mutfak akışını panelden takip edebilir.

> **Güvenlik:** Gerçek parolaları, bağlantı dizelerini, imzalama anahtarlarını, ödeme bilgilerini ve WhatsApp oturum verilerini Git'e eklemeyin. Production sırlarını sunucu ortam değişkenlerinde veya güvenli bir secret store'da tutun.

## İçindekiler

- [Öne çıkan özellikler](#öne-çıkan-özellikler)
- [Mimari](#mimari)
- [Gereksinimler](#gereksinimler)
- [Yerel geliştirme](#yerel-geliştirme)
- [Yapılandırma](#yapılandırma)
- [Veritabanı ve yedekleme](#veritabanı-ve-yedekleme)
- [Test ve yayın derlemesi](#test-ve-yayın-derlemesi)
- [Production dağıtımı](#production-dağıtımı)
- [Yardımcı betikler](#yardımcı-betikler)
- [Proje yapısı](#proje-yapısı)
- [Güvenlik](#güvenlik)
- [Katkı ve lisans](#katkı-ve-lisans)

## Öne çıkan özellikler

- İşletme, kullanıcı ve personel yönetimi
- SuperAdmin, Owner, Garson ve Mutfak rolleriyle erişim yönetimi
- Masa, QR kodu ve müşteri menüsü yönetimi
- Masa üzerinden sipariş oluşturma ve adisyon takibi
- SignalR ile canlı sipariş ve mutfak güncellemeleri
- Nakit, havale ve PayTR üzerinden kartlı ödeme akışları
- Abonelik, paket ve işletme ayarları
- E-posta ve isteğe bağlı WhatsApp üzerinden telefon doğrulama
- Yönetim ekranları, denetim kayıtları ve API

## Mimari

```text
Tarayıcı (React + Vite)
   ├── /api       ─┐
   ├── /uploads   ─┼── Vite proxy (geliştirme) ── ASP.NET Core API
   └── /hubs      ─┘                                ├── SQL Server
                                                    └── MongoDB (yapılandırılan özellikler)

WhatsApp servisi (Node.js + Baileys) ── HTTP ── ASP.NET Core API
```

Backend, `API`, `Application`, `Domain` ve `Infrastructure` projelerine ayrılmıştır. WhatsApp doğrulama servisi API'den ayrı bir Node.js süreci olarak çalışır ve isteğe bağlıdır.

## Gereksinimler

- .NET SDK 10
- Node.js 20 veya üzeri ve npm
- SQL Server
- MongoDB, kullanacağınız özelliklerin yapılandırmasına göre
- WhatsApp doğrulaması için internet erişimi olan ayrı Node.js süreci

Kurulumları doğrulayın:

```powershell
dotnet --version
node --version
npm --version
```

## Yerel geliştirme

### 1. Depoyu alın

```powershell
git clone https://github.com/SukranApp/SukranApp_Web_Application.git
cd SukranApp_Web_Application
```

### 2. Backend'i yapılandırıp çalıştırın

API'nin yerel geliştirme ayarları `backend/src/AppSukran.API/appsettings.Development.json` dosyasındadır. Kendi SQL Server bağlantınızı ve geliştirme ayarlarınızı kullanın. Hassas değerleri bu dosyaya veya Git'e eklemek yerine ortam değişkenleri ya da .NET User Secrets kullanın.

```powershell
cd backend
dotnet restore
dotnet ef database update --project src\AppSukran.Infrastructure --startup-project src\AppSukran.API
dotnet run --project src\AppSukran.API
```

API varsayılan olarak `http://localhost:5021` adresinde çalışır. Swagger arayüzü `http://localhost:5021/swagger` adresindedir. `dotnet ef` komutu bulunmuyorsa .NET Entity Framework araçlarını kurun veya yerel araç yapılandırmasını geri yükleyin.

### 3. Web arayüzünü çalıştırın

Yeni bir terminalde depo köküne dönüp:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Vite'ın bildirdiği adresi açın (varsayılan `http://localhost:5173`). Örnek ayar dosyası API isteklerini `/api` üzerinden gönderir; geliştirme proxy'si istekleri `localhost:5021` adresine yönlendirir.

### 4. WhatsApp servisini (isteğe bağlı) çalıştırın

Telefon doğrulamasında WhatsApp kullanılacaksa yeni bir terminalde:

```powershell
cd services\whatsapp
npm ci
Copy-Item .env.example .env
npm start
```

`services/whatsapp/.env` içindeki `WHATSAPP_SERVICE_TOKEN`, backend'de yapılandırılan token ile aynı olmalıdır. Servis varsayılan olarak `5055` portunda çalışır; durumu `/status` endpoint'inden kontrol edilebilir. İlk bağlantı için gereken QR kodu servis çıktısında gösterilir.

### Tüm servisleri başlatma (Windows)

Depo kökünden çalıştırılan betik backend ve frontend'i başlatır; WhatsApp servisini de yapılandırılmışsa başlatır:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
```

WhatsApp'ı atlamak için `-SkipWhatsApp`, servis durumunu görmek için `-Status`, betikle başlatılan servisleri durdurmak için `-Stop` seçeneğini kullanın.

## Yapılandırma

Örnek ayar şablonları:

- `backend/.env.example`
- `frontend/.env.example`
- `frontend/.env.production.example`
- `services/whatsapp/.env.example`

Şablonlar gerekli değişken adlarını gösterir; gerçek değerleri içermez. `.env` dosyalarını Git'e eklemeyin. Backend `.env.example` dosyası ASP.NET Core tarafından kendiliğinden yüklenmez; değişkenleri çalışan sürecin ortamında, User Secrets'ta veya dağıtım ortamınızın secret store'unda tanımlayın.

### Backend

| Ayar | Amaç |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | Yerelde `Development`, canlıda `Production` |
| `JWT_SIGNING_KEY` | Güçlü ve benzersiz JWT imzalama anahtarı; production'da en az 32 karakter |
| `SUKRAN_DB_CONNECTION` | SQL Server bağlantı dizesi |
| `SUKRAN_SUPERADMIN_PASSWORD` | İlk SuperAdmin hesabı için parola |
| `SUKRAN_WHATSAPP_TOKEN` | Backend'in WhatsApp servisine gönderdiği erişim token'ı |
| `SUKRAN_PAYTR_MERCHANT_ID` | PayTR kartlı ödemeleri için mağaza numarası |
| `SUKRAN_PAYTR_MERCHANT_KEY` | PayTR kartlı ödemeleri için mağaza anahtarı |
| `SUKRAN_PAYTR_MERCHANT_SALT` | PayTR kartlı ödemeleri için mağaza gizli değeri |
| `Mongo__ConnectionString` | MongoDB kullanılacaksa bağlantı dizesi |
| `Mongo__DatabaseName` | MongoDB kullanılacaksa veritabanı adı |

ASP.NET Core yapılandırma anahtarları ortam değişkenlerinde `__` ile ayrılabilir; örneğin `ConnectionStrings__DefaultConnection`.

### Frontend

`frontend/.env.example` geliştirme için `VITE_API_BASE_URL=/api` ayarını kullanır. `VITE_PUBLIC_APP_URL`, QR kodlarına eklenecek müşteri arayüzü adresidir; API adresi değildir. Frontend ve API canlıda ayrı alan adlarındaysa `VITE_API_BASE_URL` değerini HTTPS kullanan API adresiyle yapılandırın. İsteğe bağlı `VITE_API_FALLBACK_URLS` yedek API adreslerini virgülle alır.

Vite değişkenleri derleme sırasında frontend paketine eklenir; buraya gizli anahtar veya parola koymayın.

### WhatsApp

Servis `WHATSAPP_SERVICE_TOKEN` ve isteğe bağlı `WHATSAPP_PORT` ayarlarını kullanır. Token, backend tarafında `SUKRAN_WHATSAPP_TOKEN` olarak aynı değerle tanımlanmalıdır. `tokens/` klasörü oturum verisi içerir; depoya eklemeyin ve production sunucusunda koruyun.

## Veritabanı ve yedekleme

EF Core migration'larını uygulamak için depo kökünden:

```powershell
dotnet ef database update --project backend/src/AppSukran.Infrastructure --startup-project backend/src/AppSukran.API
```

Geliştirme veritabanı ayarları API projesinin `appsettings.Development.json` dosyasından gelir. Production bağlantısını ortam değişkeni veya güvenli yapılandırma sağlayıcısı üzerinden verin.

Windows yardımcı betikleri:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-database.ps1
powershell -ExecutionPolicy Bypass -File scripts\reset-database.ps1
```

`reset-database.ps1` veri silebilir. Yalnızca geliştirme veritabanında, doğru bağlantıyı kontrol ettikten ve yedek aldıktan sonra çalıştırın.

## Test ve yayın derlemesi

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm run build
```

Backend (depo kökünden):

```powershell
dotnet build backend/AppSukran.slnx
dotnet test backend/AppSukran.slnx
```

Testlerde gerçek müşteri verileri veya production sırları kullanmayın.

## Production dağıtımı

Ortam değişkenleri, veritabanı migration'ları, yayınlama ve servis yapılandırmasının ayrıntıları için [DEPLOYMENT.md](DEPLOYMENT.md) dosyasını izleyin. Dağıtımdan önce:

- [ ] `ASPNETCORE_ENVIRONMENT=Production` olarak ayarlandı.
- [ ] Güçlü ve benzersiz JWT imzalama anahtarı tanımlandı.
- [ ] SQL Server ve kullanılan MongoDB bağlantıları doğrulandı.
- [ ] CORS yalnızca gerçek frontend origin'lerine izin veriyor.
- [ ] Frontend'in API adresi HTTPS kullanıyor.
- [ ] Ödeme sağlayıcısı ayarları ve geri dönüş adresleri test edildi.
- [ ] WhatsApp kullanılıyorsa backend ve servis token'ları eşleşiyor.
- [ ] QR kodlarında kullanılacak frontend alan adı doğrulandı.
- [ ] WhatsApp `tokens/` gibi kalıcı çalışma verileri dağıtımda korunuyor.

Yayın betikleri:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\publish-monsterasp.ps1
powershell -ExecutionPolicy Bypass -File scripts\publish-whatsapp.ps1
```

## Yardımcı betikler

| Betik | Amaç |
|---|---|
| `scripts/start-all.ps1` | Yerel servisleri başlatır, durumlarını kontrol eder ve durdurabilir |
| `scripts/backup-database.ps1` | Veritabanı yedeği alır |
| `scripts/reset-database.ps1` | Geliştirme veritabanını sıfırlar |
| `scripts/create-superadmins.ps1` | SuperAdmin hesaplarının yönetimine yardımcı olur |
| `scripts/publish-monsterasp.ps1` | Backend yayın çıktısı üretir |
| `scripts/publish-cpanel.ps1` | cPanel dağıtımı için yayın çıktısı üretir |
| `scripts/publish-whatsapp.ps1` | WhatsApp servisi yayın çıktısı üretir |

## Proje yapısı

```text
.
├── backend/
│   ├── AppSukran.slnx
│   ├── BACKEND_API_DOKUMANI.md
│   └── src/
│       ├── AppSukran.API/
│       ├── AppSukran.Application/
│       ├── AppSukran.Domain/
│       └── AppSukran.Infrastructure/
├── docs/
│   └── KVKK_VERI_ENVANTERI.md
├── frontend/
│   ├── brand/
│   ├── public/
│   └── src/
├── services/
│   └── whatsapp/
├── scripts/
├── DEPLOYMENT.md
└── README.md
```

`node_modules/`, `bin/`, `obj/`, `dist/`, `logs/`, `publish/`, gerçek `.env` dosyaları ve WhatsApp oturum verileri çalışma ya da dağıtım verileridir; kaynak kodla birlikte commit edilmemelidir.

## Güvenlik

- Sırları depoya, örnek ayar dosyalarına veya loglara yazmayın.
- Bir sır Git geçmişine girdiyse yalnızca dosyayı silmek yeterli değildir: ilgili anahtarı/parolayı yenileyin ve geçmişteki kopyaları temizleyin.
- Production'da varsayılan veya kısa imzalama anahtarı kullanmayın.
- API ve frontend trafiğini HTTPS üzerinden sunun; CORS'u gerekli origin'lerle sınırlayın.
- Kart verilerini uygulama loglarına veya veritabanına kaydetmeyin.
- WhatsApp oturum dosyalarını erişim kontrollü tutun ve yedeklerini güvenli biçimde saklayın.

## Katkı ve lisans

Değişiklik göndermeden önce ilgili frontend lint/build ve backend build/test komutlarını çalıştırın. Büyük kapsamlı değişikliklerden önce issue açarak kapsamı netleştirin.

Lisans ve kullanım koşulları için depodaki [LICENSE](LICENSE) dosyasına bakın.
