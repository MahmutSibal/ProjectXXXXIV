using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

public sealed class User : AggregateRoot
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? RestaurantId { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>İletişim telefonu (QR menüden üye olan müşteri girer; isteğe bağlı).</summary>
    public string? Phone { get; set; }

    /// <summary>Adres (müşteri profili; isteğe bağlı).</summary>
    public string? Address { get; set; }

    /// <summary>
    /// Kampanya/ticari ileti izni (İYS kapsamında AÇIK RIZA). Varsayılan kapalıdır;
    /// yalnızca kullanıcı onay kutusunu işaretlerse açılır. <see cref="MarketingConsentAt"/>
    /// rızanın ne zaman verildiğinin kanıtıdır.
    /// </summary>
    public bool MarketingConsent { get; set; }

    public DateTime? MarketingConsentAt { get; set; }
}
