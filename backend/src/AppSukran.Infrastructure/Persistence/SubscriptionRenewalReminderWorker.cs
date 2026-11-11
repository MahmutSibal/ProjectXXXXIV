using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// Abonelik yenileme hatırlatması (yarı otomatik yenileme).
///
/// Kartla otomatik çekim PayTR'nin kart saklama yetkisini gerektirir. O yetki gelene kadar
/// süresi 3 gün içinde dolacak (veya dolmuş, ödeme bekleyen) aboneliklerin sahibine
/// e-postayla tek tıklık yenileme bağlantısı gönderilir. Her dönem için yalnızca bir
/// hatırlatma gider (<c>Subscription.RenewalReminderSentFor</c>).
/// </summary>
public sealed class SubscriptionRenewalReminderWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<SubscriptionRenewalReminderWorker> logger) : BackgroundService
{
    public static readonly TimeSpan RemindBefore = TimeSpan.FromDays(3);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(3);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(exception, "Abonelik yenileme hatırlatması başarısız oldu.");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    internal async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
        if (!email.IsEnabled)
        {
            return;
        }

        var context = scope.ServiceProvider.GetRequiredService<AppSukranDbContext>();
        await using var sweepLock = await SqlApplicationLock.TryAcquireAsync(context, "AppSukran.RenewalReminders", cancellationToken);
        if (sweepLock is null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var horizon = now + RemindBefore;

        // İptal edilmiş abonelik hatırlatılmaz (kullanıcı kendi bitirmek istedi).
        var due = await context.Subscriptions
            .Where(s => (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trialing || s.Status == SubscriptionStatus.PastDue)
                && s.CurrentPeriodEnd <= horizon
                && (s.RenewalReminderSentFor == null || s.RenewalReminderSentFor != s.CurrentPeriodEnd))
            .Take(200)
            .ToListAsync(cancellationToken);

        foreach (var subscription in due)
        {
            var restaurant = await context.Restaurants.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == subscription.RestaurantId, cancellationToken);
            var owner = restaurant is null ? null : await context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == restaurant.OwnerId && u.IsActive, cancellationToken);

            if (owner is not null)
            {
                var endLocal = subscription.CurrentPeriodEnd.AddHours(3);
                var expired = subscription.CurrentPeriodEnd <= now;
                var subject = expired
                    ? "Şükran App paketinizin süresi doldu"
                    : $"Şükran App paketiniz {endLocal:dd.MM.yyyy} tarihinde bitiyor";
                var body =
                    $"Merhaba {owner.Name},\n\n" +
                    (expired
                        ? $"{restaurant!.Name} işletmenizin Şükran App paketinin süresi {endLocal:dd.MM.yyyy} tarihinde doldu. "
                          + "Siparişleriniz ve QR menünüz kesintiye uğramasın diye paketinizi yenilemenizi öneririz.\n\n"
                        : $"{restaurant!.Name} işletmenizin Şükran App paketi {endLocal:dd.MM.yyyy HH:mm} tarihinde bitiyor. "
                          + "Kesinti yaşamamak için şimdiden yenileyebilirsiniz; kalan süreniz kaybolmaz.\n\n") +
                    $"Yenilemek için: {email.AppBaseUrl}/admin/subscription\n\n" +
                    "Ödeme PayTR güvenli ödeme sayfası üzerinden kartla alınır.\n\nŞükran App";

                try
                {
                    await email.SendAsync(owner.Email, subject, body, cancellationToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    // E-posta gitmediyse işaretlenmez; bir sonraki turda tekrar denenir.
                    logger.LogWarning(exception, "Yenileme hatırlatması gönderilemedi ({RestaurantId}).", subscription.RestaurantId);
                    continue;
                }
            }

            // Sahibi bulunamayan kayıt da işaretlenir; her turda boşuna denenmesin.
            subscription.RenewalReminderSentFor = subscription.CurrentPeriodEnd;
        }

        if (due.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Yenileme hatırlatması: {Count} abonelik işlendi.", due.Count);
        }
    }
}
