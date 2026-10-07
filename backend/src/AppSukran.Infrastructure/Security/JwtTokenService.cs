using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Enums;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AppSukran.Infrastructure.Security;

public sealed class JwtTokenService(IOptions<JwtSettings> options) : ITokenService
{
    public string CreateToken(string userId, string email, UserRole role, string? restaurantId = null)
    {
        var settings = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Role, role.ToString()),
            new(ClaimTypes.NameIdentifier, userId)
        };

        // RestaurantOwner gibi bir restorana bağlı kullanıcılar için kapsam claim'i.
        // Orders/Bills yetkilendirmesi bu claim'i QrSession token'ındaki ile aynı
        // ("restaurantId") biçimde okur; böylece çapraz-restoran erişimi engellenir.
        if (!string.IsNullOrWhiteSpace(restaurantId))
        {
            claims.Add(new Claim("restaurantId", restaurantId));
        }

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(settings.ExpirationMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public QrSessionToken CreateQrSessionToken(string restaurantId, int tableNo, string tableSessionId, string qrToken, TimeSpan? lifetime = null)
    {
        var settings = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromHours(4));
        var subject = $"qr:{restaurantId}:{tableNo}:{tableSessionId}";

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject),
            new(ClaimTypes.NameIdentifier, subject),
            new(ClaimTypes.Role, UserRole.Customer.ToString()),
            new("restaurantId", restaurantId),
            new("tableNo", tableNo.ToString()),
            new("tableSessionId", tableSessionId),
            new("qrToken", qrToken)
        };

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new QrSessionToken(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}