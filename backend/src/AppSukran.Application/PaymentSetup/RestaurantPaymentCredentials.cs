using System.Security.Cryptography;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;

namespace AppSukran.Application.PaymentSetup;

public static class RestaurantPaymentCredentials
{
    /// <summary>İzin verilen iyzico adresleri (sonda '/' olmadan).</summary>
    public static readonly string[] AllowedBaseUrls =
    [
        "https://api.iyzipay.com",
        "https://sandbox-api.iyzipay.com",
    ];

    public const string SandboxBaseUrl = "https://sandbox-api.iyzipay.com";

    /// <summary>
    /// Kayıtlı anahtarları çözer. Anahtar yoksa veya çözülemezse (ör. JWT anahtarı
    /// değişti) null döner; işletme anahtarlarını yeniden girmelidir.
    /// </summary>
    public static (string ApiKey, string SecretKey)? TryDecrypt(
        RestaurantPaymentSettings? settings, ISecretProtectionService protection)
    {
        if (settings is null
            || string.IsNullOrWhiteSpace(settings.ApiKeyProtected)
            || string.IsNullOrWhiteSpace(settings.SecretKeyProtected))
        {
            return null;
        }

        try
        {
            var apiKey = protection.Unprotect(settings.ApiKeyProtected);
            var secretKey = protection.Unprotect(settings.SecretKeyProtected);
            return string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(secretKey)
                ? null
                : (apiKey, secretKey);
        }
        catch (CryptographicException)
        {
            return null;
        }
    }

    /// <summary>Tanınabilir ama ifşa etmeyen gösterim: "sand••••3f".</summary>
    public static string Mask(string? apiKey)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            return string.Empty;
        }

        return apiKey.Length >= 10
            ? apiKey[..4] + "••••" + apiKey[^2..]
            : "••••";
    }

    /// <summary>Adresi allow-list'e göre normalize eder; listede yoksa null.</summary>
    public static string? NormalizeBaseUrl(string? baseUrl)
    {
        var trimmed = (baseUrl ?? string.Empty).Trim().TrimEnd('/');
        return AllowedBaseUrls.FirstOrDefault(
            allowed => string.Equals(allowed, trimmed, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>İşletme adres seçmediyse platform varsayılanı (geçersizse sandbox).</summary>
    public static string DefaultBaseUrl(string globalBaseUrl)
        => NormalizeBaseUrl(globalBaseUrl) ?? SandboxBaseUrl;
}
