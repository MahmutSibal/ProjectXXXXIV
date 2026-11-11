using AppSukran.Application.Abstractions.Security;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// Hassas kişisel verilerin (T.C. kimlik no) veritabanında şifreli tutulması.
///
/// Şifreleme veritabanı katmanında, şeffaf yapılır: uygulama kodu açık değerle çalışır,
/// diske yalnızca AES-256-GCM ile şifrelenmiş hâli ("v1:..." ile başlar) yazılır.
/// Veritabanı yedeği ya da tablosu sızsa bile kimlik numaraları okunamaz.
///
/// Eski (şifrelenmemiş) kayıtlar okunurken olduğu gibi döner ve
/// <see cref="PersonalDataMaintenanceWorker"/> tarafından şifrelenir.
///
/// DİKKAT: Anahtar JWT imza anahtarından türetilir; JWT_SIGNING_KEY değişirse
/// kimlik numaraları çözülemez ve işletmelerin yeniden girmesi gerekir.
/// </summary>
public static class PersonalDataProtection
{
    private const string EncryptedPrefix = "v1:";

    /// <summary>DbContext oluşturulurken DI'dan atanır (EF modeli bir kez kurulur).</summary>
    internal static ISecretProtectionService? Protector { get; set; }

    public static readonly ValueConverter<string, string> Converter = new(
        plain => Encrypt(plain),
        stored => Decrypt(stored));

    public static bool IsEncrypted(string? stored) => stored?.StartsWith(EncryptedPrefix, StringComparison.Ordinal) == true;

    private static string Encrypt(string plain)
    {
        if (string.IsNullOrEmpty(plain) || IsEncrypted(plain) || Protector is null)
        {
            return plain;
        }
        return Protector.Protect(plain);
    }

    private static string Decrypt(string stored)
    {
        if (!IsEncrypted(stored) || Protector is null)
        {
            return stored;
        }
        return Protector.Unprotect(stored);
    }
}
