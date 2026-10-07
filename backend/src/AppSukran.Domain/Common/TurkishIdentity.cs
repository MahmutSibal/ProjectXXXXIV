namespace AppSukran.Domain.Common;

/// <summary>
/// T.C. kimlik ve MERSİS numarası doğrulaması.
///
/// Sadece uzunluk kontrolü yetmez: yanlış yazılmış bir kimlik numarası fatura
/// kesilirken reddedilir ve hata çok geç fark edilir. Bu yüzden T.C. kimlik
/// numarası resmî sağlama algoritmasıyla doğrulanır.
/// </summary>
public static class TurkishIdentity
{
    /// <summary>
    /// T.C. kimlik numarası doğrulaması (11 hane + sağlama).
    ///
    /// Kural:
    ///  - 11 hane, ilk hane 0 olamaz
    ///  - (1,3,5,7,9. hanelerin toplamı × 7 − 2,4,6,8. hanelerin toplamı) mod 10 = 10. hane
    ///  - İlk 10 hanenin toplamı mod 10 = 11. hane
    /// </summary>
    public static bool IsValidNationalId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var digits = value.Trim();
        if (digits.Length != 11 || !digits.All(char.IsAsciiDigit) || digits[0] == '0')
        {
            return false;
        }

        var d = digits.Select(character => character - '0').ToArray();

        var oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
        var evenSum = d[1] + d[3] + d[5] + d[7];

        // Çıkarma negatif olabilir; mod işlemi öncesi 10 ile normalize edilir.
        var tenth = ((oddSum * 7) - evenSum) % 10;
        if (tenth < 0)
        {
            tenth += 10;
        }

        if (tenth != d[9])
        {
            return false;
        }

        var firstTenSum = d.Take(10).Sum();
        return firstTenSum % 10 == d[10];
    }

    /// <summary>MERSİS numarası: 16 hane.</summary>
    public static bool IsValidMersis(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var digits = new string(value.Where(char.IsAsciiDigit).ToArray());
        return digits.Length == 16;
    }

    /// <summary>Posta kodu: 5 hane (Türkiye).</summary>
    public static bool IsValidPostalCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var digits = new string(value.Where(char.IsAsciiDigit).ToArray());
        return digits.Length == 5;
    }

    /// <summary>
    /// Kimlik numarasını gösterim ve loglar için maskeler: 12345678901 -> 123******01
    /// Hassas veri hiçbir yerde açık dolaşmamalıdır.
    /// </summary>
    public static string MaskNationalId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length < 5)
        {
            return "***";
        }

        return $"{value[..3]}{new string('*', value.Length - 5)}{value[^2..]}";
    }

    /// <summary>MERSİS maskesi: ilk 4 ve son 2 hane görünür.</summary>
    public static string MaskMersis(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length < 6)
        {
            return "***";
        }

        return $"{value[..4]}{new string('*', value.Length - 6)}{value[^2..]}";
    }
}
