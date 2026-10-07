namespace AppSukran.Application.Abstractions.Security;

public interface IRefreshTokenService
{
    string GenerateRefreshToken();
    string HashRefreshToken(string refreshToken);
    DateTime GetExpiryUtc();
}