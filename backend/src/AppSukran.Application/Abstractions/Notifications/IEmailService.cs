namespace AppSukran.Application.Abstractions.Notifications;

/// <summary>
/// İşlemsel e-posta gönderimi (doğrulama kodu vb.). SMTP üzerinden çalışır;
/// sağlayıcı (Brevo vb.) yalnızca ayarlarla değişir.
/// </summary>
public interface IEmailService
{
    bool IsEnabled { get; }

    Task SendAsync(string toAddress, string subject, string textBody, CancellationToken cancellationToken = default);
}

/// <summary>Kullanıcıya gösterilebilecek gönderim hataları.</summary>
public sealed class EmailDeliveryException(string message) : Exception(message);
