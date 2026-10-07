namespace AppSukran.Application.Abstractions.Notifications;

/// <param name="Status">disconnected | starting | qr | connected | failed</param>
/// <param name="QrDataUrl">Eşleşme bekleniyorsa QR görseli (data URL), yoksa null.</param>
public sealed record WhatsAppStatus(
    string Status,
    string? QrDataUrl,
    string? PhoneNumber,
    string? LastError,
    DateTime? ConnectedAt);

/// <summary>
/// wppconnect tabanlı WhatsApp servisiyle konuşur. Servis ayrı bir Node süreci
/// olarak çalışır (bkz. services/whatsapp).
/// </summary>
public interface IWhatsAppService
{
    bool IsEnabled { get; }

    Task<WhatsAppStatus> GetStatusAsync(CancellationToken cancellationToken = default);

    Task<WhatsAppStatus> StartSessionAsync(CancellationToken cancellationToken = default);

    Task<WhatsAppStatus> LogoutAsync(CancellationToken cancellationToken = default);

    /// <param name="normalizedPhone">Ülke kodu dahil, yalnızca rakam.</param>
    Task SendMessageAsync(string normalizedPhone, string message, CancellationToken cancellationToken = default);
}

/// <summary>Numaranın WhatsApp'ta kayıtlı olmaması gibi, kullanıcıya iletilebilir durumlar.</summary>
public sealed class WhatsAppException(string message) : Exception(message);
