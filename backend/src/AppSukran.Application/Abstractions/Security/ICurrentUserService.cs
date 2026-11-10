namespace AppSukran.Application.Abstractions.Security;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }

    /// Kullanıcının bağlı olduğu restoran (RestaurantOwner access token'ı veya
    /// QrSession token'ı bu claim'i taşır). Çapraz-restoran erişim kontrolünde kullanılır.
    string? RestaurantId { get; }

    /// QR ile masadan bağlanan müşterinin masası (yalnızca QrSession token'ında bulunur).
    /// Müşterinin başka masa adına işlem yapmasını engellemek için kullanılır.
    int? TableNo { get; }

    /// İsteği yapan istemcinin IP adresi. Ödeme sağlayıcıları dolandırıcılık
    /// denetimi için bunu zorunlu tutar. Ters vekil arkasında UseForwardedHeaders
    /// sayesinde gerçek istemci IP'si okunur.
    string? IpAddress { get; }

    bool IsAuthenticated { get; }
    bool IsInRole(string role);
}