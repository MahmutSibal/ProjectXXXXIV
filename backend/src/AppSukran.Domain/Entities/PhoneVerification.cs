using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// WhatsApp ile gönderilen telefon doğrulama kodu.
///
/// Kod DÜZ METİN saklanmaz: veritabanını okuyabilen biri aktif kodları görüp
/// başkasının telefonunu doğrulayabilirdi. Refresh token'larda olduğu gibi
/// yalnızca SHA-256 özeti tutulur.
/// </summary>
public class PhoneVerification : AggregateRoot
{
    /// <summary>Normalize edilmiş numara (yalnızca rakam, ülke kodu dahil).</summary>
    public string Phone { get; set; } = string.Empty;

    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    /// <summary>Yanlış deneme sayısı. Sınırı aşınca kod geçersizleşir (kaba kuvvet koruması).</summary>
    public int AttemptCount { get; set; }

    /// <summary>Doğrulandığı an. Dolu ise kod tekrar kullanılamaz.</summary>
    public DateTime? VerifiedAt { get; set; }

    /// <summary>
    /// Doğrulama sonrası üretilen tek kullanımlık jetonun özeti. Kayıt isteği bunu
    /// getirir; böylece "kodu doğruladım" iddiası sunucuda kanıtlanır.
    /// </summary>
    public string? TicketHash { get; set; }

    public DateTime? TicketExpiresAt { get; set; }

    /// <summary>Jeton kullanıldı mı? Tek bir kayıt için geçerlidir.</summary>
    public bool TicketConsumed { get; set; }

    public const int MaxAttempts = 5;

    public bool IsExpired(DateTime utcNow) => ExpiresAt <= utcNow;

    public bool IsUsable(DateTime utcNow) =>
        VerifiedAt is null && AttemptCount < MaxAttempts && !IsExpired(utcNow);

    public bool IsTicketValid(DateTime utcNow) =>
        VerifiedAt is not null
        && !TicketConsumed
        && TicketHash is not null
        && TicketExpiresAt > utcNow;
}
