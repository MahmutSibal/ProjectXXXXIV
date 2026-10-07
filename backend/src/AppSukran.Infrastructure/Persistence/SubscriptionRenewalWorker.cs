using AppSukran.Application.Abstractions.Payments;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// Dönemi biten abonelikleri saklı kartla otomatik yeniler.
///
/// Deneme sürümü bittiğinde de burası devreye girer: müşteri deneme başlarken
/// kartını ve dönemini (aylık/yıllık) seçmiştir; 14. günün sonunda seçtiği
/// tutar otomatik tahsil edilir.
///
/// Tahsilat başarısızsa abonelik "Ödeme Bekleniyor" durumuna geçer ve
/// <see cref="Subscription.PastDueGraceDays"/> gün daha açık kalır
/// (bkz. SubscriptionExpiryWorker).
/// </summary>
public sealed class SubscriptionRenewalWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<SubscriptionRenewalWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    /// <summary>
    /// Üst üste bu kadar başarısız denemeden sonra otomatik yenileme bırakılır.
    /// Amaç: reddedilen bir kartı sonsuza dek denemeyip sağlayıcı nezdinde
    /// şüpheli trafik oluşturmamak. Kullanıcı kartını güncelleyince sıfırlanır.
    /// </summary>
    private const int MaxAutoRetryCount = 4;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RenewDueAsync(stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(exception, "Otomatik abonelik yenileme turu başarısız oldu.");
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

    private async Task RenewDueAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppSukranDbContext>();
        var gateway = scope.ServiceProvider.GetRequiredService<IPaymentGateway>();

        var now = DateTime.UtcNow;

        // Dönemi bitmiş, otomatik yenilemesi açık ve saklı kartı olan abonelikler.
        // İptal edilenler dışarıda: iptal, "sonraki yenilemeyi durdur" demektir.
        var due = await context.Subscriptions
            .Where(subscription =>
                subscription.AutoRenew
                && subscription.PaymentMethodUserKey != null
                && subscription.PaymentMethodToken != null
                && subscription.CurrentPeriodEnd <= now
                && subscription.PaymentFailureCount < MaxAutoRetryCount
                && (subscription.Status == SubscriptionStatus.Trialing
                    || subscription.Status == SubscriptionStatus.Active
                    || subscription.Status == SubscriptionStatus.PastDue))
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
        {
            return;
        }

        var succeeded = 0;
        var failed = 0;

        foreach (var subscription in due)
        {
            // Denemeden ücretli pakete geçişte fiyat, denemenin taklit ettiği paketten
            // değil müşterinin SEÇTİĞİ paketten hesaplanır.
            var planToCharge = subscription.Plan == SubscriptionPlan.Trial
                ? SubscriptionPlan.Pro
                : subscription.Plan;

            var quote = PlanCatalog.Quote(planToCharge, subscription.BillingPeriodMonths);

            var owner = await context.Users
                .Where(user => user.RestaurantId == subscription.RestaurantId && user.Role == UserRole.RestaurantOwner)
                .FirstOrDefaultAsync(cancellationToken);

            var result = await gateway.ChargeStoredCardAsync(
                new StoredCardChargeRequest(
                    $"{subscription.Id}-{now:yyyyMMddHHmm}",
                    subscription.PaymentMethodUserKey!,
                    subscription.PaymentMethodToken!,
                    quote.Total,
                    owner?.Id ?? subscription.RestaurantId,
                    owner?.Email ?? "abonelik@sukranapp.com",
                    owner?.Name ?? "İşletme Sahibi",
                    $"{PlanCatalog.Get(planToCharge).DisplayName} Abonelik"),
                cancellationToken);

            if (result.Success)
            {
                // Dönem, ödemenin yapıldığı andan değil ÖNCEKİ DÖNEM SONUNDAN devam eder;
                // böylece yenileme birkaç saat gecikse de müşteri gün kaybetmez.
                var periodStart = subscription.CurrentPeriodEnd > now ? subscription.CurrentPeriodEnd : now;
                var periodEnd = periodStart.AddMonths(subscription.BillingPeriodMonths);

                subscription.Plan = planToCharge;
                subscription.Status = SubscriptionStatus.Active;
                subscription.CurrentPeriodStart = periodStart;
                subscription.CurrentPeriodEnd = periodEnd;
                subscription.PricePerPeriod = quote.Total;
                subscription.PriceVersion = quote.PriceVersion;
                subscription.TrialEndsAt = null;
                subscription.MarkPaymentSucceeded(now);

                subscription.Payments.Add(new SubscriptionPayment
                {
                    Amount = quote.Total,
                    PaidAt = now,
                    TransactionId = result.TransactionId,
                    Provider = result.Provider,
                    PeriodEnd = periodEnd,
                    PriceVersion = quote.PriceVersion,
                });

                succeeded++;
                logger.LogInformation(
                    "[Renewal] {RestaurantId} yenilendi: {Plan} {Months} ay, tx={Tx}",
                    subscription.RestaurantId, planToCharge, subscription.BillingPeriodMonths, result.TransactionId);
            }
            else
            {
                subscription.Status = SubscriptionStatus.PastDue;
                subscription.MarkPaymentFailed(now, result.ErrorMessage ?? "Otomatik tahsilat reddedildi.");

                failed++;
                logger.LogWarning(
                    "[Renewal] {RestaurantId} tahsilat başarısız ({Attempt}. deneme): {Error}",
                    subscription.RestaurantId, subscription.PaymentFailureCount, result.ErrorMessage);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("[Renewal] Tur bitti: {Succeeded} başarılı, {Failed} başarısız.", succeeded, failed);
    }
}
