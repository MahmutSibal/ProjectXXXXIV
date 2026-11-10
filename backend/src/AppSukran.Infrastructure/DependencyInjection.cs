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
            services.Configure<Settings.PaymentSettings>(configuration.GetSection("Payment"));
            services.Configure<Settings.WhatsAppSettings>(configuration.GetSection("WhatsApp"));

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

            services.AddDbContext<AppSukranDbContext>(options =>
                options.UseSqlServer(connectionString));

            services.AddScoped(typeof(IGenericRepository<>), typeof(EfGenericRepository<>));
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<ITokenService, Security.JwtTokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordHashingService, PasswordHashingService>();
        services.AddScoped<ICardNumberProtectionService, CardNumberProtectionService>();
        services.AddSingleton<ISecretProtectionService, SecretProtectionService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddScoped<IOrderRealtimePublisher, SignalROrderRealtimePublisher>();
        services.AddScoped<IAuditLogService, EfAuditLogService>();
        services.AddSingleton<AppSukran.Application.Abstractions.Maintenance.IServerShutdownState,
            Maintenance.ServerShutdownState>();
        services.AddHttpClient<IPosBridgeService, HttpPosBridgeService>();

        // Ödeme sağlayıcısı appsettings "Payment:Provider" değerine göre seçilir:
        // "Fake" (simülasyon, geliştirme) ya da "None" (gerçek sağlayıcı yok, kart
        // tahsilatı reddedilir). PayTR entegrasyonu buraya eklenecek.
        services.AddScoped<FakePaymentGateway>();
        services.AddScoped<UnavailablePaymentGateway>();
        services.AddScoped<IPaymentGateway>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<Settings.PaymentSettings>>().Value;
            IPaymentGateway gateway = settings.IsFake
                ? sp.GetRequiredService<FakePaymentGateway>()
                : sp.GetRequiredService<UnavailablePaymentGateway>();

            // Aktif sağlayıcıyı görünür kıl: yapılandırma okunmadığında sessizce
            // yanlış sağlayıcıya düşülüp "ödeme çalışıyor" sanılmasın.
            sp.GetRequiredService<ILogger<IPaymentGateway>>()
                .LogInformation("[Payment] Aktif sağlayıcı: {Provider}", gateway.Provider);

            return gateway;
        });

        // Masa ödemeleri için ayrı çözümleyici; global IPaymentGateway yalnızca
        // platformun abonelik tahsilatları içindir.
        services.AddSingleton<IPaymentPlatformInfo, PaymentPlatformInfo>();
        services.AddScoped<IRestaurantPaymentGatewayResolver, RestaurantPaymentGatewayResolver>();

        // WhatsApp doğrulama (ayrı wppconnect servisi ile konuşur).
        services.AddHttpClient<IWhatsAppService, Notifications.WppConnectWhatsAppService>();
        services.AddScoped<IVerificationCodeService, VerificationCodeService>();
        services.AddScoped<IPhoneVerificationGuard, Application.Common.Security.PhoneVerificationGuard>();
        services.AddScoped<IPhoneVerificationPolicy>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<Settings.WhatsAppSettings>>().Value;
            return new WhatsAppVerificationPolicy(settings);
        });

        services.AddScoped<IRestaurantSearchService, RestaurantSearchService>();
        services.AddHostedService<DatabaseMigrationInitializer>();
        services.AddHostedService<SuperAdminSeeder>();
        services.AddHostedService<SubscriptionExpiryWorker>();

        return services;
    }
}