namespace AppSukran.Application.Abstractions.Notifications;

/// <summary>
/// İşlemsel e-posta gönderimi (doğrulama kodu vb.). SMTP üzerinden çalışır;
/// sağlayıcı (Brevo vb.) yalnızca ayarlarla değişir.
/// </summary>
public interface IEmailService
{
    bool IsEnabled { get; }

    /// <summary>Platform bildirimlerinin (iletişim formu vb.) gideceği adres; tanımlı değilse null.</summary>
    string? NotificationAddress { get; }

    /// <summary>Uygulamanın herkese açık adresi (e-postadaki bağlantılar için).</summary>
    string AppBaseUrl { get; }

    Task SendAsync(string toAddress, string subject, string textBody, CancellationToken cancellationToken = default);
}

/// <summary>Kullanıcıya gösterilebilecek gönderim hataları.</summary>
public sealed class EmailDeliveryException(string message) : Exception(message);
