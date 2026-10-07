using System.Security.Cryptography;
using System.Text;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Security;

/// <summary>
/// AES-256-GCM ile geri açılabilir şifreleme. Anahtar, JWT imza anahtarından
/// HKDF-SHA256 ile (sabit amaç dizesiyle) türetilir; çıktı "v1:" + base64(nonce|tag|şifreli).
///
/// DİKKAT: JWT imza anahtarı değiştirilirse saklı değerler çözülemez; işletme
/// sahipleri iyzico anahtarlarını yeniden girmelidir (bkz. DEPLOYMENT.md).
/// </summary>
public sealed class SecretProtectionService(IOptions<JwtSettings> jwtOptions) : ISecretProtectionService
{
    private const string Prefix = "v1:";
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private static readonly byte[] Purpose = Encoding.UTF8.GetBytes("sukran.restaurant-payment-secrets.v1");

    private readonly Lazy<byte[]> _key = new(() =>
    {
        var signingKey = jwtOptions.Value.SigningKey;
        if (string.IsNullOrWhiteSpace(signingKey))
        {
            throw new InvalidOperationException("Sır şifreleme için JWT imza anahtarı yapılandırılmamış.");
        }

        return HKDF.DeriveKey(HashAlgorithmName.SHA256, Encoding.UTF8.GetBytes(signingKey), 32, salt: [], info: Purpose);
    });

    public string Protect(string plainText)
    {
        ArgumentNullException.ThrowIfNull(plainText);

        var plain = Encoding.UTF8.GetBytes(plainText);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plain.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(_key.Value, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag);

        var payload = new byte[NonceSize + TagSize + cipher.Length];
        nonce.CopyTo(payload, 0);
        tag.CopyTo(payload, NonceSize);
        cipher.CopyTo(payload, NonceSize + TagSize);

        return Prefix + Convert.ToBase64String(payload);
    }

    public string Unprotect(string protectedValue)
    {
        if (string.IsNullOrEmpty(protectedValue) || !protectedValue.StartsWith(Prefix, StringComparison.Ordinal))
        {
            throw new CryptographicException("Şifreli değer biçimi tanınmadı.");
        }

        byte[] payload;
        try
        {
            payload = Convert.FromBase64String(protectedValue[Prefix.Length..]);
        }
        catch (FormatException exception)
        {
            throw new CryptographicException("Şifreli değer bozuk.", exception);
        }

        if (payload.Length < NonceSize + TagSize)
        {
            throw new CryptographicException("Şifreli değer bozuk.");
        }

        var nonce = payload.AsSpan(0, NonceSize);
        var tag = payload.AsSpan(NonceSize, TagSize);
        var cipher = payload.AsSpan(NonceSize + TagSize);
        var plain = new byte[cipher.Length];

        using var aes = new AesGcm(_key.Value, TagSize);
        aes.Decrypt(nonce, cipher, tag, plain);

        return Encoding.UTF8.GetString(plain);
    }
}
