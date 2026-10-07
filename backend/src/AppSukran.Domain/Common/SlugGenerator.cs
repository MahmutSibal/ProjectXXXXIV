using System.Text;
using System.Text.RegularExpressions;

namespace AppSukran.Domain.Common;

/// <summary>
/// İşletme adından URL'e uygun slug üretir.
/// Türkçe karakterler latin karşılıklarına çevrilir; aksi hâlde doğrudan
/// atıldıkları için "Şükran Lokantası" gibi adlar okunamaz hâle gelirdi.
/// </summary>
public static class SlugGenerator
{
    private static readonly Regex NotAllowed = new("[^a-z0-9-]+", RegexOptions.Compiled);
    private static readonly Regex MultipleDashes = new("-{2,}", RegexOptions.Compiled);

    private static readonly Dictionary<char, string> TurkishMap = new()
    {
        ['ç'] = "c", ['Ç'] = "c",
        ['ğ'] = "g", ['Ğ'] = "g",
        ['ı'] = "i", ['I'] = "i", ['İ'] = "i", ['i'] = "i",
        ['ö'] = "o", ['Ö'] = "o",
        ['ş'] = "s", ['Ş'] = "s",
        ['ü'] = "u", ['Ü'] = "u",
    };

    public static string Create(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(raw.Length);
        foreach (var character in raw.Trim())
        {
            if (TurkishMap.TryGetValue(character, out var replacement))
            {
                builder.Append(replacement);
            }
            else if (char.IsWhiteSpace(character) || character is '_' or '.')
            {
                builder.Append('-');
            }
            else
            {
                builder.Append(char.ToLowerInvariant(character));
            }
        }

        var slug = NotAllowed.Replace(builder.ToString(), string.Empty);
        slug = MultipleDashes.Replace(slug, "-").Trim('-');

        return slug;
    }

    /// <summary>
    /// Slug zaten kullanılıyorsa sonuna sayı ekleyerek benzersizleştirir:
    /// "sukran-lokantasi", "sukran-lokantasi-2", "sukran-lokantasi-3"...
    /// </summary>
    public static string MakeUnique(string baseSlug, Func<string, bool> isTaken)
    {
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "isletme";
        }

        if (!isTaken(baseSlug))
        {
            return baseSlug;
        }

        for (var suffix = 2; suffix < 1000; suffix++)
        {
            var candidate = $"{baseSlug}-{suffix}";
            if (!isTaken(candidate))
            {
                return candidate;
            }
        }

        // Son çare: çakışma ihtimali olmayan rastgele ek.
        return $"{baseSlug}-{Guid.NewGuid():N}"[..Math.Min(baseSlug.Length + 9, 200)];
    }
}
