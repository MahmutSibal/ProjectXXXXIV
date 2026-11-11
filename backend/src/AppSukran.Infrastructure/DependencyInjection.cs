using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.PhoneVerification.Commands;
using AppSukran.Application.Restaurants.Queries;
using AppSukran.Infrastructure.Payments;
using AppSukran.Infrastructure.Persistence;
using AppSukran.Infrastructure.Realtime;
using AppSukran.Infrastructure.Repositories;
using AppSukran.Infrastructure.Security;
using AppSukran.Infrastructure.Integrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure;

public static class DependencyInjection
{
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<Settings.JwtSettings>(configuration.GetSection("Jwt"));

            // JWT_SIGNING_KEY, Program.cs'te yalnızca token DOĞRULAMA tarafına uygulanıyordu.
            // Token ÜRETEN JwtTokenService ise IOptions<JwtSettings> okur ve oradaki değer
            // appsettings.json'daki geliştirme anahtarı olarak kalıyordu (Production dosyası
            // SigningKey tanımlamaz, taban dosyadaki değer hayatta kalır).
            //
            // Sonuç iki yönlü hataydı: üretilen token doğrulayan anahtarla uyuşmadığı için
            // her korumalı istek 401 dönüyordu ("The signature key was not found"), ve
            // production'daki token'lar depoda açıkça duran anahtarla imzalanıyordu.
            var jwtSigningKey = Environment.GetEnvironmentVariable("JWT_SIGNING_KEY");
            if (!string.IsNullOrWhiteSpace(jwtSigningKey))
            {
                services.PostConfigure<Settings.JwtSettings>(settings => settings.SigningKey = jwtSigningKey);
            }
            services.Configure<Settings.SuperAdminSettings>(configuration.GetSection("SuperAdmin"));
            services.Configure<Settings.IntegrationSettings>(configuration.GetSection("Integration"));
            services.Configure<Settings.PayTrSettings>(configuration.GetSection("PayTr"));
            // PayTR anahtarları appsettings'e yazılmaz; ortam değişkeninden okunur.
            var payTrId = Environment.GetEnvironmentVariable("SUKRAN_PAYTR_MERCHANT_ID");
            var payTrKey = Environment.GetEnvironmentVariable("SUKRAN_PAYTR_MERCHANT_KEY");
            var payTrSalt = Environment.GetEnvironmentVariable("SUKRAN_PAYTR_MERCHANT_SALT");
            services.PostConfigure<Settings.PayTrSettings>(settings =>
            {
                if (!string.IsNullOrWhiteSpace(payTrId)) settings.MerchantId = payTrId.Trim();
                if (!string.IsNullOrWhiteSpace(payTrKey)) settings.MerchantKey = payTrKey.Trim();
                if (!string.IsNullOrWhiteSpace(payTrSalt)) settings.MerchantSalt = payTrSalt.Trim();
            });
            services.Configure<Settings.WhatsAppSettings>(configuration.GetSection("WhatsApp"));
            services.Configure<Settings.EmailSettings>(configuration.GetSection("Email"));

            // Production'da bağlantı dizesi ve SuperAdmin parolası appsettings'e YAZILMAZ;
            // ortam değişkeninden okunur (bkz. DEPLOYMENT.md).
            var connectionString = Environment.GetEnvironmentVariable("SUKRAN_DB_CONNECTION")
                ?? configuration.GetConnectionString("DefaultConnection");

            var superAdminPassword = Environment.GetEnvironmentVariable("SUKRAN_SUPERADMIN_PASSWORD");
            if (!string.IsNullOrWhiteSpace(superAdminPassword))
            {
                services.PostConfigure<Settings.SuperAdminSettings>(settings => settings.Password = superAdminPassword);
            }


            var whatsAppToken = Environment.GetEnvironmentVariable("SUKRAN_WHATSAPP_TOKEN");
            if (!string.IsNullOrWhiteSpace(whatsAppToken))
            {
                services.PostConfigure<Settings.WhatsAppSettings>(settings => settings.ServiceToken = whatsAppToken);
            }

            var smtpPassword = Environment.GetEnvironmentVariable("SUKRAN_SMTP_PASSWORD");
            if (!string.IsNullOrWhiteSpace(smtpPassword))
            {
                services.PostConfigure<Settings.EmailSettings>(settings => settings.Password = smtpPassword);
            }

            services.AddDbContext<AppSukranDbContext>(options =>
                options.UseSqlServer(connectionString));

            services.AddScoped(typeof(IGenericRepository<>), typeof(EfGenericRepository<>));
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<ITokenService, Security.JwtTokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordHashingService, PasswordHashingService>();
        services.AddSingleton<ISecretProtectionService, SecretProtectionService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddScoped<IOrderRealtimePublisher, SignalROrderRealtimePublisher>();
        services.AddScoped<IAuditLogService, EfAuditLogService>();
        services.AddSingleton<AppSukran.Application.Abstractions.Maintenance.IServerShutdownState,
            Maintenance.ServerShutdownState>();
        services.AddHttpClient<IPosBridgeService, HttpPosBridgeService>();

        // Kartla ödeme yalnızca PayTR üzerinden alınır (Direkt API). Kart bilgisi sunucumuza
        // hiç gelmez: tarayıcı doğrudan PayTR'ye gönderir, sonuç bildirim ucuna (callback) gelir.
        services.AddHttpClient<IPayTrService, PayTrService>(client => client.Timeout = TimeSpan.FromSeconds(30));
        services.AddScoped<IPaymentPlatformInfo, PaymentPlatformInfo>();

        // WhatsApp doğrulama (ayrı wppconnect servisi ile konuşur).
        // Varsayılan 100 sn çok uzun: servis takılırsa kullanıcı kayıt ekranında
        // "Kod gönderiliyor..." diye bekliyordu. Servisin kendi sınırları 8+15 sn.
        services.AddHttpClient<IWhatsAppService, Notifications.WppConnectWhatsAppService>(
            client => client.Timeout = TimeSpan.FromSeconds(25));
        services.AddSingleton<IEmailService, Notifications.SmtpEmailService>();
        services.AddScoped<IVerificationCodeService, VerificationCodeService>();
        services.AddScoped<IPhoneVerificationGuard, Application.Common.Security.PhoneVerificationGuard>();
        services.AddScoped<IPhoneVerificationPolicy>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<Settings.WhatsAppSettings>>().Value;
            var emailSettings = sp.GetRequiredService<IOptions<Settings.EmailSettings>>().Value;
            return new WhatsAppVerificationPolicy(settings, emailSettings);
        });

        services.AddScoped<IRestaurantSearchService, RestaurantSearchService>();
        services.AddHostedService<DatabaseMigrationInitializer>();
        services.AddHostedService<SuperAdminSeeder>();
        services.AddHostedService<SubscriptionExpiryWorker>();
        services.AddHostedService<Payments.PayTrTransferWorker>();
        services.AddHostedService<PersonalDataMaintenanceWorker>();

        return services;
    }
}