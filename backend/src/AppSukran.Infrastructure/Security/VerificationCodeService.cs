using System.Security.Cryptography;
using System.Text;
using AppSukran.Application.Abstractions.Security;

namespace AppSukran.Infrastructure.Security;

public sealed class VerificationCodeService : IVerificationCodeService
{
    public string GenerateNumericCode(int digits = 6)
    {
        // Random yerine RandomNumberGenerator: kod tahmin edilebilir olmamalı.
        var max = (int)Math.Pow(10, digits);
        var value = RandomNumberGenerator.GetInt32(0, max);
        // Baştaki sıfırlar korunur ("042315" gibi kodlar da geçerli).
        return value.ToString(new string('0', digits));
    }

    public string GenerateTicket()
        => Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    public string Hash(string value)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    public bool Verify(string value, string expectedHash)
    {
        var actual = Encoding.UTF8.GetBytes(Hash(value));
        var expected = Encoding.UTF8.GetBytes(expectedHash ?? string.Empty);

        // Uzunluklar farklıysa da sabit süreli karşılaştırma yapılır.
        return actual.Length == expected.Length
            && CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
