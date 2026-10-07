using System.Security.Cryptography;
using AppSukran.Application.Abstractions.Security;

namespace AppSukran.Infrastructure.Security;

public sealed class CardNumberProtectionService : ICardNumberProtectionService
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    public string HashCardNumber(string cardNumber)
    {
        var normalized = NormalizeCardNumber(cardNumber);
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(normalized, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public bool VerifyCardNumber(string cardNumber, string cardHash)
    {
        var normalized = NormalizeCardNumber(cardNumber);
        var parts = cardHash.Split('.');
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations))
        {
            return false;
        }

        var salt = Convert.FromBase64String(parts[1]);
        var expectedHash = Convert.FromBase64String(parts[2]);
        var actualHash = Rfc2898DeriveBytes.Pbkdf2(normalized, salt, iterations, HashAlgorithmName.SHA256, expectedHash.Length);
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }

    public string NormalizeCardNumber(string cardNumber)
    {
        return new string(cardNumber.Where(char.IsDigit).ToArray());
    }

    public bool IsValidCardNumber(string cardNumber)
    {
        var normalized = NormalizeCardNumber(cardNumber);
        if (normalized.Length is < 13 or > 19)
        {
            return false;
        }

        var sum = 0;
        var shouldDouble = false;

        for (var i = normalized.Length - 1; i >= 0; i--)
        {
            var digit = normalized[i] - '0';
            if (digit is < 0 or > 9)
            {
                return false;
            }

            if (shouldDouble)
            {
                digit *= 2;
                if (digit > 9)
                {
                    digit -= 9;
                }
            }

            sum += digit;
            shouldDouble = !shouldDouble;
        }

        return sum % 10 == 0;
    }

    public string DetectBrand(string cardNumber)
    {
        var normalized = NormalizeCardNumber(cardNumber);
        if (string.IsNullOrWhiteSpace(normalized)) return "Unknown";
        if (normalized.StartsWith('4')) return "Visa";
        if (normalized.StartsWith("34") || normalized.StartsWith("37")) return "American Express";
        if (normalized.StartsWith("51") || normalized.StartsWith("52") || normalized.StartsWith("53") || normalized.StartsWith("54") || normalized.StartsWith("55")) return "Mastercard";
        if (normalized.StartsWith("6011") || normalized.StartsWith("65")) return "Discover";
        return "Unknown";
    }

    public string GetLast4(string cardNumber)
    {
        var normalized = NormalizeCardNumber(cardNumber);
        return normalized.Length >= 4 ? normalized[^4..] : normalized;
    }

    public bool IsExpiryValid(int expiryMonth, int expiryYear, DateTime? utcNow = null)
    {
        if (expiryMonth is < 1 or > 12) return false;
        if (expiryYear < 2000) return false;

        var now = utcNow ?? DateTime.UtcNow;
        var yearMonth = new DateTime(expiryYear, expiryMonth, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1).AddDays(-1);
        return yearMonth >= now.Date;
    }
}