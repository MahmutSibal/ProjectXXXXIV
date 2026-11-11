using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// "Şifremi unuttum" bağlantısındaki tek kullanımlık anahtar. Anahtarın kendisi değil,
/// yalnızca SHA-256 özeti saklanır: veritabanını okuyabilen biri bağlantıyı üretemez.
/// </summary>
public class PasswordResetToken : AggregateRoot
{
    public const int LifetimeMinutes = 30;

    public string UserId { get; set; } = string.Empty;

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? UsedAt { get; set; }

    public bool IsUsable(DateTime utcNow) => UsedAt is null && ExpiresAt > utcNow;
}
