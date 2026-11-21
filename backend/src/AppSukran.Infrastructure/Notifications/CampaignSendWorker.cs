using System.Security.Cryptography;
using System.Text;
using System.Threading.Channels;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Campaigns;
using AppSukran.Domain.Entities;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Notifications;

/// <summary>Bellek içi gönderim kuyruğu: kampanyayı başlatan sunucu onu kendi işçisine verir.</summary>
public sealed class CampaignQueue : ICampaignQueue
{
    private readonly Channel<string> channel = Channel.CreateUnbounded<string>();

    public ChannelReader<string> Reader => channel.Reader;

    public ValueTask EnqueueAsync(string campaignId, CancellationToken cancellationToken = default)
        => channel.Writer.WriteAsync(campaignId, cancellationToken);
}

/// <summary>"Abonelikten çık" bağlantısı için HMAC imzası (JWT anahtarından türetilir).</summary>
public sealed class UnsubscribeTokenService(IOptions<JwtSettings> jwtOptions) : IUnsubscribeTokenService
{
    public string Create(string userId)
    {
        var hash = Compute(userId);
        return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public bool IsValid(string userId, string token)
    {
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
        {
            return false;
        }

        var expected = Encoding.ASCII.GetBytes(Create(userId));
        var actual = Encoding.ASCII.GetBytes(token);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private byte[] Compute(string userId)
    {
        var key = Encoding.UTF8.GetBytes("campaign-unsubscribe:" + jwtOptions.Value.SigningKey);
        return HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(userId));
    }
}

/// <summary>
/// Kuyruktaki kampanyaları, kampanya iznini vermiş kullanıcılara tek tek ve yavaşça gönderir
/// (sağlayıcı sınırlarını aşmamak için). İlerleme kayda düzenli yazılır.
/// </summary>
public sealed class CampaignSendWorker(
    CampaignQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<CampaignSendWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Pause = TimeSpan.FromMilliseconds(250);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var campaignId in queue.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await SendAsync(campaignId, stoppingToken);
                }
                catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogError(exception, "[Kampanya] {CampaignId} gönderimi hata verdi", campaignId);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Kapanış.
        }
    }

    private async Task SendAsync(string campaignId, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var tokenService = scope.ServiceProvider.GetRequiredService<IUnsubscribeTokenService>();

        var campaigns = unitOfWork.Repository<Campaign>();
        var campaign = await campaigns.GetByIdAsync(campaignId, cancellationToken);
        if (campaign is null || campaign.Status != Campaign.StatusSending)
        {
            return;
        }

        var recipients = await unitOfWork.Repository<User>().FindAsync(
            user => user.MarketingConsent && user.IsActive && user.Email != string.Empty, cancellationToken);

        campaign.RecipientCount = recipients.Count;
        var processed = 0;

        foreach (var user in recipients)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var url = CampaignMessage.UnsubscribeUrl(emailService.AppBaseUrl, user.Id, tokenService.Create(user.Id));
            try
            {
                var html = campaign.IsRich && emailService.RichCampaignsEnabled
                    ? CampaignMessage.ComposeHtml(campaign.Subject, campaign.Body, campaign.ImageUrl, campaign.ButtonText, campaign.ButtonUrl, url)
                    : null;
                await emailService.SendMarketingAsync(
                    user.Email, campaign.Subject, CampaignMessage.Compose(campaign.Body, url), url, html, cancellationToken);
                campaign.SentCount++;
            }
            catch (EmailDeliveryException)
            {
                campaign.FailedCount++;
            }

            processed++;
            if (processed % 10 == 0)
            {
                await campaigns.ReplaceAsync(campaign, cancellationToken);
            }

            await Task.Delay(Pause, cancellationToken);
        }

        campaign.Status = campaign.SentCount == 0 && campaign.FailedCount > 0
            ? Campaign.StatusFailed
            : Campaign.StatusCompleted;
        campaign.CompletedAt = DateTime.UtcNow;
        await campaigns.ReplaceAsync(campaign, cancellationToken);

        logger.LogInformation(
            "[Kampanya] {CampaignId} tamamlandı: {Sent} gönderildi, {Failed} başarısız",
            campaign.Id, campaign.SentCount, campaign.FailedCount);
    }
}
