using System.Text;

namespace AppSukran.Domain.Common;

/// <summary>Türkiye IBAN'ı: "TR" + 24 rakam, ISO 13616 mod-97 sağlaması.</summary>
public static class TurkishIban
{
    public const int Length = 26;

    /// <summary>Boşlukları atar ve büyük harfe çevirir.</summary>
    public static string Normalize(string? iban)
        => new string((iban ?? string.Empty).Where(c => !char.IsWhiteSpace(c)).ToArray()).ToUpperInvariant();

    /// <param name="normalized"><see cref="Normalize"/> çıktısı.</param>
    public static bool IsValid(string normalized)
    {
        if (normalized.Length != Length || !normalized.StartsWith("TR", StringComparison.Ordinal))
        {
            return false;
        }

        if (!normalized.Skip(2).All(char.IsAsciiDigit))
        {
            return false;
        }

        var rearranged = normalized[4..] + normalized[..4];
        var remainder = 0;
        foreach (var character in rearranged)
        {
            var value = char.IsAsciiDigit(character) ? character - '0' : character - 'A' + 10;
            remainder = value >= 10
                ? (remainder * 100 + value) % 97
                : (remainder * 10 + value) % 97;
        }

        return remainder == 1;
    }

    /// <summary>"TR12 3456 ..." biçimi (4'lü gruplar).</summary>
    public static string Format(string normalized)
    {
        if (string.IsNullOrEmpty(normalized))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(normalized.Length + normalized.Length / 4);
        for (var index = 0; index < normalized.Length; index++)
        {
            if (index > 0 && index % 4 == 0)
            {
                builder.Append(' ');
            }

            builder.Append(normalized[index]);
        }

        return builder.ToString();
    }

    /// <summary>Denetim kaydı için: yalnızca son 4 hane.</summary>
    public static string Mask(string normalized)
        => string.IsNullOrEmpty(normalized)
            ? "-"
            : "****" + (normalized.Length > 4 ? normalized[^4..] : normalized);
}
