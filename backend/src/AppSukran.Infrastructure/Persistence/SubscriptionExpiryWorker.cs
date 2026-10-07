using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// Dönemi biten abonelikleri periyodik olarak PastDue/Expired durumuna taşır.
/// Erişim kontrolü zaten <see cref="Subscription.GrantsAccess"/> ile anlık yapılır;
/// bu servis yalnızca durumun listelerde/raporlarda doğru görünmesini sağlar.
/// </summary>
public sealed class SubscriptionExpiryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<SubscriptionExpiryWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SweepAsync(stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(exception, "Abonelik süre kontrolü başarısız oldu.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task SweepAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppSukranDbContext>();

        var now = DateTime.UtcNow;
        var graceCutoff = now.AddDays(-Subscription.PastDueGraceDays);

        // 1) Dönemi bitmiş aktif/deneme abonelikler -> "Ödeme Bekleniyor".
        //    Erişim KESİLMEZ; ek süre boyunca hizmet sürer.
        //
        // Otomatik yenilemesi olanlar HARİÇ: onların sahibi SubscriptionRenewalWorker'dır.
        // İkisi de aynı kaydı güncellerse, tahsilat başarılı olsa bile buradaki
        // "ödeme alınamadı" işaretlemesi başarının üzerine yazıyor ve hata sayacı
        // yanlışlıkla artıyordu. Yenileme başarısız olursa PastDue'yu o worker koyar.
        var pastDue = await context.Subscriptions
            .Where(subscription =>
                (subscription.Status == SubscriptionStatus.Active || subscription.Status == SubscriptionStatus.Trialing)
                && subscription.CurrentPeriodEnd <= now
                && !(subscription.AutoRenew
                     && subscription.PaymentMethodUserKey != null
                     && subscription.PaymentMethodToken != null))
            .ToListAsync(cancellationToken);

        foreach (var subscription in pastDue)
        {
            subscription.Status = SubscriptionStatus.PastDue;
            subscription.LastPaymentAttemptAt = now;
            subscription.PaymentFailureCount += 1;
            subscription.LastPaymentError ??= "Dönem sonunda tahsilat yapılamadı.";
        }

        // 2) Ek süre de dolmuş olanlar -> erişim kapanır.
        var expired = await context.Subscriptions
            .Where(subscription =>
                subscription.Status == SubscriptionStatus.PastDue
                && subscription.CurrentPeriodEnd <= graceCutoff)
            .ToListAsync(cancellationToken);

        foreach (var subscription in expired)
        {
            subscription.Status = SubscriptionStatus.Expired;
        }

        // 3) İptal edilmiş ve ödenmiş dönemi bitmiş olanlar -> erişim kapanır.
        //    (İptal anında değil, dönem sonunda kapanır: müşteri bedelini ödemişti.)
        var cancelledFinished = await context.Subscriptions
            .Where(subscription =>
                subscription.Status == SubscriptionStatus.Cancelled
                && subscription.CurrentPeriodEnd <= now)
            .ToListAsync(cancellationToken);

        foreach (var subscription in cancelledFinished)
        {
            subscription.Status = SubscriptionStatus.Expired;
        }

        if (pastDue.Count > 0 || expired.Count > 0 || cancelledFinished.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation(
                "Abonelik süre kontrolü: {PastDue} ödeme bekliyor, {Expired} ek süresi doldu, {Cancelled} iptal dönemi bitti.",
                pastDue.Count, expired.Count, cancelledFinished.Count);
        }
    }
}
