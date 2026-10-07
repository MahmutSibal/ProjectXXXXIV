using System.Text.RegularExpressions;

namespace AppSukran.Domain.Common;

/// <summary>
/// Telefon numarasını WhatsApp'ın beklediği biçime çevirir: ülke kodu dahil,
/// yalnızca rakam (ör. "0532 000 11 22" -> "905320001122").
///
/// Normalizasyon şart: aynı numara "0532...", "+90532...", "532..." gibi farklı
/// yazılırsa her biri ayrı kayıt olur ve doğrulama tutmaz.
/// </summary>
public static class PhoneNumber
{
    private const string TurkeyCountryCode = "90";

    public static string Normalize(string? raw, string defaultCountryCode = TurkeyCountryCode)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var digits = Regex.Replace(raw, @"\D", string.Empty);

        if (digits.Length == 0)
        {
            return string.Empty;
        }

        // "00" ile başlayan uluslararası önek (0090...) -> ülke kodu
        if (digits.StartsWith("00", StringComparison.Ordinal))
        {
            digits = digits[2..];
        }

        // Yerel biçim: 0532... -> baştaki 0 atılır, ülke kodu eklenir
        if (digits.StartsWith('0'))
        {
            digits = defaultCountryCode + digits.TrimStart('0');
        }
        else if (!digits.StartsWith(defaultCountryCode, StringComparison.Ordinal) && digits.Length == 10)
        {
            // 5320001122 gibi ülke kodsuz 10 hane
            digits = defaultCountryCode + digits;
        }

        return digits;
    }

    /// <summary>Kabaca geçerli mi? (ülke kodu + numara için makul uzunluk)</summary>
    public static bool IsPlausible(string normalized) =>
        normalized.Length is >= 11 and <= 15;

    /// <summary>Loglar ve arayüz için maskeler: 905320001122 -> +90 532 *** ** 22</summary>
    public static string Mask(string normalized)
    {
        if (normalized.Length < 6)
        {
            return "***";
        }

        return $"+{normalized[..2]} {normalized[2..5]} *** ** {normalized[^2..]}";
    }
}
