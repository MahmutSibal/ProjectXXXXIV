using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;

namespace AppSukran.Application.Subscriptions;

/// <summary>
/// Ödemesi alınmış bir paketi aboneliğe işler. Süper Admin onayı (havale) ve PayTR
/// ile kartla ödeme aynı kuralı kullanır.
/// </summary>
public static class SubscriptionActivation
{
    public static void Activate(
        Subscription subscription,
        SubscriptionPlan plan,
        int billingPeriodMonths,
        long amountMinor,
        string priceVersion,
        string provider,
        DateTime now)
    {
        // Süresi henüz dolmamışsa kalan süre kaybolmasın: mevcut dönem sonundan devam et.
        var periodStart = subscription.CurrentPeriodEnd > now && subscription.Status != SubscriptionStatus.Cancelled
            ? subscription.CurrentPeriodEnd
            : now;
        var periodEnd = periodStart.AddMonths(billingPeriodMonths);

        subscription.Plan = plan;
        subscription.Status = SubscriptionStatus.Active;
        subscription.CurrentPeriodStart = periodStart;
        subscription.CurrentPeriodEnd = periodEnd;
        subscription.PricePerPeriod = amountMinor;
        subscription.BillingPeriodMonths = billingPeriodMonths;
        subscription.PriceVersion = priceVersion;
        subscription.MarkPaymentSucceeded(now);
        subscription.CancelledAt = null;
        subscription.Payments.Add(new SubscriptionPayment
        {
            Amount = amountMinor,
            PaidAt = now,
            Provider = provider,
            PeriodEnd = periodEnd,
            PriceVersion = priceVersion,
        });
    }
}
