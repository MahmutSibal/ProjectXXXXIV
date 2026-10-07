namespace AppSukran.Application.Abstractions.Security;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }

    /// Kullanıcının bağlı olduğu restoran (RestaurantOwner access token'ı veya
    /// QrSession token'ı bu claim'i taşır). Çapraz-restoran erişim kontrolünde kullanılır.
    string? RestaurantId { get; }

    /// İsteği yapan istemcinin IP adresi. Ödeme sağlayıcıları (iyzico) dolandırıcılık
    /// denetimi için bunu zorunlu tutar. Ters vekil arkasında UseForwardedHeaders
    /// sayesinde gerçek istemci IP'si okunur.
    string? IpAddress { get; }

    bool IsAuthenticated { get; }
    bool IsInRole(string role);
}