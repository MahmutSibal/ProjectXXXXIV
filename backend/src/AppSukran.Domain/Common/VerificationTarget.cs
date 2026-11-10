using System.Net.Mail;

namespace AppSukran.Domain.Common;

/// <summary>
/// Doğrulama kodunun gittiği hedef. Telefon doğrulamaları normalize edilmiş numara
/// (yalnızca rakam) ile, e-posta doğrulamaları "e:" önekli adresle aynı tabloda
/// tutulur. Numara rakamdan oluştuğu için iki tür asla çakışmaz.
/// </summary>
public static class VerificationTarget
{
    private const string EmailPrefix = "e:";

    public static string ForEmail(string email) => EmailPrefix + NormalizeEmail(email);

    public static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    public static bool IsPlausibleEmail(string normalizedEmail)
    {
        if (normalizedEmail.Length is < 6 or > 254) return false;
        if (!MailAddress.TryCreate(normalizedEmail, out var parsed)) return false;

        // MailAddress "Ad <a@b>" biçimini de kabul eder; yalnızca çıplak adres istiyoruz.
        if (!string.Equals(parsed.Address, normalizedEmail, StringComparison.Ordinal)) return false;

        var domain = parsed.Host;
        return domain.Contains('.') && !domain.StartsWith('.') && !domain.EndsWith('.');
    }

    /// <summary>"mahmut@gmail.com" → "m****@gmail.com"</summary>
    public static string MaskEmail(string normalizedEmail)
    {
        var at = normalizedEmail.IndexOf('@');
        if (at <= 0) return "****";

        var local = normalizedEmail[..at];
        var visible = local.Length <= 2 ? local[..1] : local[..2];
        return visible + new string('*', Math.Max(3, local.Length - visible.Length)) + normalizedEmail[at..];
    }
}
