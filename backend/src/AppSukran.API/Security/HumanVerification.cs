using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace AppSukran.API.Security;

/// <summary>
/// Robot (insan) doğrulaması: Cloudflare Turnstile (bölüm adı "Turnstile").
///
/// İki anahtar da tanımlıysa giriş ve kayıt uçları doğrulama ister; biri bile yoksa doğrulama
/// KAPALIDIR ve uçlar eskisi gibi çalışır. Gizli anahtar depoya yazılmaz; production'da
/// SUKRAN_TURNSTILE_SECRET ortam değişkeninden okunur. Site anahtarı herkese açıktır ve
/// frontend onu GET /api/auth/human-verification ile backend'den alır: böylece doğrulamanın
/// açık olup olmadığının tek kaynağı backend'dir, frontend ayrıca derlenmek zorunda kalmaz.
/// </summary>
public sealed class TurnstileSettings
{
    public string SiteKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    public bool IsEnabled => !string.IsNullOrWhiteSpace(SiteKey) && !string.IsNullOrWhiteSpace(SecretKey);
}

public sealed class TurnstileVerifier(HttpClient httpClient, IOptions<TurnstileSettings> options, ILogger<TurnstileVerifier> logger)
{
    public const string HeaderName = "X-Turnstile-Token";
    private const string VerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    public bool IsEnabled => options.Value.IsEnabled;

    public string? SiteKey => options.Value.IsEnabled ? options.Value.SiteKey : null;

    public async Task<bool> VerifyAsync(string? token, string? remoteIp, CancellationToken cancellationToken)
    {
        // Turnstile jetonu en fazla 2048 karakterdir.
        if (string.IsNullOrWhiteSpace(token) || token.Length > 2048)
        {
            return false;
        }

        var form = new Dictionary<string, string>
        {
            ["secret"] = options.Value.SecretKey,
            ["response"] = token,
        };
        if (!string.IsNullOrEmpty(remoteIp))
        {
            form["remoteip"] = remoteIp;
        }

        try
        {
            using var content = new FormUrlEncodedContent(form);
            using var response = await httpClient.PostAsync(VerifyUrl, content, cancellationToken);
            var result = await response.Content.ReadFromJsonAsync<SiteVerifyResponse>(cancellationToken);
            if (result?.Success == true)
            {
                return true;
            }

            logger.LogInformation("[Turnstile] Doğrulama reddedildi: {Errors}", string.Join(",", result?.ErrorCodes ?? []));
            return false;
        }
        catch (Exception exception) when (
            (exception is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
            && !cancellationToken.IsCancellationRequested)
        {
            // Cloudflare'e ulaşılamıyorsa kullanıcıların girişini kilitlemek yerine istek geçirilir:
            // hız sınırları ve hesap başına deneme sayacı (LoginAttemptGuard) yine çalışır.
            logger.LogWarning(exception, "[Turnstile] Doğrulama servisine ulaşılamadı; istek doğrulamasız geçirildi.");
            return true;
        }
    }

    private sealed record SiteVerifyResponse(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("error-codes")] string[]? ErrorCodes);
}

/// <summary>
/// İşaretlenen uç, doğrulama açıksa geçerli bir Turnstile jetonu (X-Turnstile-Token başlığı) ister.
/// Jeton tek kullanımlıktır; frontend her denemede yenisini alır.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class RequireHumanVerificationAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var verifier = http.RequestServices.GetRequiredService<TurnstileVerifier>();

        if (verifier.IsEnabled)
        {
            var token = http.Request.Headers[TurnstileVerifier.HeaderName].ToString();
            var ip = http.Connection.RemoteIpAddress?.ToString();
            if (!await verifier.VerifyAsync(token, ip, http.RequestAborted))
            {
                context.Result = new BadRequestObjectResult(new
                {
                    message = "Robot doğrulaması tamamlanamadı. Lütfen \"Ben robot değilim\" doğrulamasını yenileyip tekrar deneyin.",
                    code = "human-verification-failed",
                });
                return;
            }
        }

        await next();
    }
}
