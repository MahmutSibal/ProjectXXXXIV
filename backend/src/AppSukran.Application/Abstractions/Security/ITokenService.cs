using AppSukran.Domain.Enums;

namespace AppSukran.Application.Abstractions.Security;

public interface ITokenService
{
    string CreateToken(string userId, string email, UserRole role, string? restaurantId = null);
    QrSessionToken CreateQrSessionToken(string restaurantId, int tableNo, string tableSessionId, string qrToken, TimeSpan? lifetime = null);
}

public sealed record QrSessionToken(string AccessToken, DateTime ExpiresAt);