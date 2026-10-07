using System.Security.Cryptography;
using System.Text;
using AppSukran.Application.Abstractions.Security;

namespace AppSukran.Infrastructure.Security;

public sealed class RefreshTokenService : IRefreshTokenService
{
    private const int DefaultExpiryDays = 7;

    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public string HashRefreshToken(string refreshToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToBase64String(hash);
    }

    public DateTime GetExpiryUtc() => DateTime.UtcNow.AddDays(DefaultExpiryDays);
}