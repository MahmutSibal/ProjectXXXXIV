using System.Text;
using System.Threading.RateLimiting;
using AppSukran.API.Middleware;
using AppSukran.Application;
using AppSukran.Infrastructure;
using AppSukran.Infrastructure.Realtime;
using AppSukran.Infrastructure.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
// NOT: Enum'lar bilerek SAYISAL (int) serialize edilir. Hem Flutter mobil hem
// Next.js web paneli yanıtlardaki enum'ları sayısal olarak okuyacak biçimde yazıldı;
// string'e çevirmek web panelini (numerik karşılaştırmalar) bozar. Girişte ise
// System.Text.Json zaten hem int hem string deseralize eder.
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Uçların çoğu JWT ister. Tanım olmadan Swagger UI'da "Authorize" düğmesi
    // çıkmaz ve korumalı uçlar arayüzden hiç denenemez.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "/api/auth/login yanıtındaki accessToken değerini yapıştırın ('Bearer' öneki gerekmez).",
    });

    // Microsoft.OpenApi 2.x'te şema referansı ayrı bir tiptir; eski
    // OpenApiSecurityScheme.Reference kullanımı derlenmez.
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", document, null), new List<string>() },
    });
});

const string WebClientCorsPolicy = "WebClient";
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "https://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(WebClientCorsPolicy, policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(_ => true)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            // In production: only allow credentials when explicit, non-wildcard origins are configured.
            var hasWildcard = configuredOrigins?.Contains("*") ?? false;
            var hasOrigins = configuredOrigins != null && configuredOrigins.Length > 0;

            if (hasOrigins)
            {
                var corsBuilder = policy.WithOrigins(configuredOrigins!)
                    .AllowAnyHeader()
                    .AllowAnyMethod();

                if (!hasWildcard)
                {
                    corsBuilder.AllowCredentials();
                }
            }
            else
            {
                policy.AllowAnyHeader().AllowAnyMethod();
            }
        }
    });
});
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("orders-write", limiterOptions =>
    {
        limiterOptions.PermitLimit = 30;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 10;
        limiterOptions.AutoReplenishment = true;
    });

    options.AddFixedWindowLimiter("payments-write", limiterOptions =>
    {
        limiterOptions.PermitLimit = 20;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 10;
        limiterOptions.AutoReplenishment = true;
    });


    // Her istek WhatsApp'tan dışarıya mesaj gönderir; dar tutulur.
    options.AddFixedWindowLimiter("phone-verification", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(10);
        limiterOptions.QueueLimit = 0;
        limiterOptions.AutoReplenishment = true;
    });

    // Giriş ve kayıt. reCAPTCHA projeden kaldırıldıktan sonra bu uçlardaki tek
    // bot/kaba kuvvet koruması budur.
    //
    // Diğerlerinin aksine IP başına bölümlenir: tek bir sabit pencere paylaşılsaydı
    // bir saldırgan kotayı doldurup bütün müşterilerin girişini engelleyebilirdi.
    // Gerçek istemci IP'si için UseForwardedHeaders bu ara katmandan önce çalışır.
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "bilinmeyen",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
// Allow overriding the signing key from an environment variable for secret management workflows
var envSigningKey = Environment.GetEnvironmentVariable("JWT_SIGNING_KEY");
if (!string.IsNullOrEmpty(envSigningKey))
{
    jwtSettings.SigningKey = envSigningKey;
}
var signingKey = Encoding.UTF8.GetBytes(jwtSettings.SigningKey ?? string.Empty);

// Production'da zayıf/varsayılan imza anahtarıyla başlamayı engelle (fail-fast).
if (!builder.Environment.IsDevelopment())
{
    const string DevDefaultKey = "THIS_IS_A_DEVELOPMENT_ONLY_SIGNING_KEY_CHANGE_ME";
    if (string.IsNullOrWhiteSpace(jwtSettings.SigningKey) ||
        string.Equals(jwtSettings.SigningKey, DevDefaultKey, StringComparison.Ordinal) ||
        signingKey.Length < 32)
    {
        throw new InvalidOperationException(
            "JWT signing key is not configured for production. Set a strong (>=32 chars) JWT_SIGNING_KEY environment variable.");
    }
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(signingKey),
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // WebSocket el sıkışması özel başlık taşıyamaz; SignalR bu yüzden
            // token'ı "access_token" sorgu parametresiyle gönderir.
            //
            // Yalnızca /hubs yollarında kabul ediyoruz. Her uçta kabul edilseydi
            // token, sunucu erişim loglarına ve Referer başlıklarına düşerdi.
            var accessToken = context.Request.Query["access_token"];

            if (!string.IsNullOrEmpty(accessToken) &&
                context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        },
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminOnly", policy => policy.RequireRole("SuperAdmin"));
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    if (builder.Environment.IsDevelopment())
    {
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        options.ForwardLimit = 1;
    }
});

var app = builder.Build();

// Fail-fast'in ikinci ayağı. Yukarıdaki kontrol bu dosyanın yerel jwtSettings
// değişkenine bakar; oysa token'ları İMZALAYAN servis IOptions<JwtSettings> okur.
// İki kaynak ayrı beslendiği için bir kez sessizce ayrışmışlardı: imzalama
// appsettings.json'daki geliştirme anahtarını, doğrulama ortam değişkenini
// kullanıyordu ve her korumalı istek 401 dönüyordu. Artık gerçekten kullanılan
// anahtar denetleniyor.
if (!app.Environment.IsDevelopment())
{
    var signingKeyInUse = app.Services
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<JwtSettings>>().Value.SigningKey;

    if (!string.Equals(signingKeyInUse, jwtSettings.SigningKey, StringComparison.Ordinal))
    {
        throw new InvalidOperationException(
            "Token imzalama anahtarı ile doğrulama anahtarı farklı. " +
            "Bu hâlde üretilen her token reddedilir; uygulama başlatılmıyor.");
    }
}

// DİKKAT: Swagger, SecurityHeadersMiddleware'den ÖNCE olmalı. Aşağı alınırsa
// CSP "default-src 'none'" Swagger UI'ın kendi JS/CSS'ini engeller ve arayüz
// boş sayfa olarak açılır. Swagger yalnızca Development'ta açıktır.
// Swagger üretimde varsayılan olarak KAPALIDIR: tüm uç noktaları, parametreleri ve
// veri şemalarını herkese listeler. Test için bilinçli olarak Swagger:Enabled ile açılır.
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (!app.Environment.IsDevelopment())
{
    // Tarayıcıya "bu siteye bir daha yalnızca HTTPS ile bağlan" der.
    app.UseHsts();
}

var httpsPortConfigured = !string.IsNullOrWhiteSpace(builder.Configuration["ASPNETCORE_HTTPS_PORT"]);
if (httpsPortConfigured)
{
    app.UseHttpsRedirection();
}

app.UseCors(WebClientCorsPolicy);
app.UseStaticFiles();
app.UseRateLimiter();

app.UseAuthentication();

// Yazılımsal sunucu kapatma: kimlik doğrulamadan SONRA (context.User dolu; SignalR
// access_token'ı JwtBearer OnMessageReceived ile burada zaten çözülmüş olur) ve
// yetkilendirmeden/controller'lardan/hub'tan ÖNCE. Aksi hâlde anonim istek 503 yerine 401 alırdı.
app.UseMiddleware<ServerShutdownMiddleware>();

app.UseAuthorization();

app.MapControllers();
app.MapHub<OrderHub>("/hubs/orders").RequireAuthorization();

app.Run();
