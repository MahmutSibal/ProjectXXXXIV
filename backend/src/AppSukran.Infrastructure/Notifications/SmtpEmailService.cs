using System.Net;
using System.Net.Mail;
using System.Text;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Notifications;

/// <summary>SMTP ile e-posta gönderir (Brevo, Gmail SMTP vb. ile çalışır).</summary>
public sealed class SmtpEmailService(
    IOptions<EmailSettings> options,
    ILogger<SmtpEmailService> logger) : IEmailService
{
    public bool IsEnabled => options.Value.Enabled && options.Value.IsConfigured;

    public string? NotificationAddress => !IsEnabled ? null
        : !string.IsNullOrWhiteSpace(options.Value.NotificationAddress) ? options.Value.NotificationAddress
        : options.Value.FromAddress;

    public string AppBaseUrl => options.Value.AppBaseUrl.TrimEnd('/');

    public bool RichCampaignsEnabled => IsEnabled && options.Value.RichCampaignsEnabled;

    public Task SendAsync(string toAddress, string subject, string textBody, CancellationToken cancellationToken = default)
        => SendCoreAsync(toAddress, subject, textBody, null, cancellationToken);

    public Task SendMarketingAsync(string toAddress, string subject, string textBody, string unsubscribeUrl, string? htmlBody = null, CancellationToken cancellationToken = default)
        => SendCoreAsync(toAddress, subject, textBody, unsubscribeUrl, cancellationToken, htmlBody);

    private async Task SendCoreAsync(string toAddress, string subject, string textBody, string? unsubscribeUrl, CancellationToken cancellationToken, string? htmlBody = null)
    {
        var settings = options.Value;
        if (!IsEnabled)
        {
            throw new EmailDeliveryException("E-posta ile doğrulama şu an kullanılamıyor.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(settings.FromAddress, settings.FromName, Encoding.UTF8),
            Subject = subject,
            SubjectEncoding = Encoding.UTF8,
            Body = textBody,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = false,
        };
        message.To.Add(toAddress);
        if (htmlBody is not null && settings.RichCampaignsEnabled)
        {
            // Düz metin gövde yedek olarak kalır; HTML görüntüleyen istemciler HTML bölümünü gösterir.
            message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(htmlBody, Encoding.UTF8, "text/html"));
        }
        if (unsubscribeUrl is not null)
        {
            message.Headers.Add("List-Unsubscribe", $"<{unsubscribeUrl}>");
            message.Headers.Add("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
        }

        using var client = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = settings.EnableSsl,
            Credentials = new NetworkCredential(settings.Username, settings.Password),
            DeliveryMethod = SmtpDeliveryMethod.Network,
            // Varsayılan 100 sn; kullanıcı kayıt ekranında bekliyor.
            Timeout = 20_000,
        };

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (SmtpFailedRecipientException exception)
        {
            logger.LogWarning(exception, "[E-posta] Alıcı reddedildi");
            throw new EmailDeliveryException("Bu e-posta adresine gönderim yapılamadı. Adresi kontrol edin.");
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // Ayrıntı (sunucu yanıtı, kullanıcı adı) yalnızca loga yazılır, kullanıcıya gösterilmez.
            logger.LogError(exception, "[E-posta] Gönderilemedi");
            throw new EmailDeliveryException("Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.");
        }
    }
}
