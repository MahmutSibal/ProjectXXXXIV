using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Subscriptions;

namespace AppSukran.Application.Subscriptions;

public static class SubscriptionMapping
{
    public static SubscriptionResponse ToResponse(this Subscription subscription)
    {
        var definition = PlanCatalog.Get(subscription.Plan);
        var now = DateTime.UtcNow;
        var daysRemaining = (int)Math.Ceiling((subscription.CurrentPeriodEnd - now).TotalDays);

        return new SubscriptionResponse(
            subscription.Id,
            subscription.RestaurantId,
            subscription.Plan,
            definition.DisplayName,
            subscription.Status,
            subscription.CurrentPeriodStart,
            subscription.CurrentPeriodEnd,
            subscription.TrialEndsAt,
            subscription.PricePerPeriod,
            subscription.BillingPeriodMonths,
            subscription.LastPaymentAt,
            subscription.GrantsAccess(now),
            Math.Max(0, daysRemaining),
            subscription.IsCancelledButStillActive(now),
            subscription.GraceEndsAt,
            subscription.PaymentFailureCount,
            subscription.LastPaymentError,
            subscription.AutoRenew,
            subscription.PaymentMethodLast4,
            subscription.PaymentMethodBrand,
            definition.Features.MaxTables,
            definition.Features.HasStaffPanels,
            definition.Features.HasDetailedReports,
            definition.Features.HasEvents,
            subscription.Payments
                .OrderByDescending(payment => payment.PaidAt)
                .Select(payment => new SubscriptionPaymentResponse(
                    payment.Id, payment.Amount, payment.PaidAt, payment.TransactionId, payment.Provider, payment.PeriodEnd))
                .ToList());
    }

    public static PlanFeaturesResponse ToResponse(this PlanFeatures features)
        => new(
            features.HasQrMenu,
            features.HasOrdering,
            features.MaxQrOrdersPerPeriod,
            features.MaxKitchenPanels,
            features.MaxWaiterPanels,
            features.HasStaffPanels,
            features.HasDetailedReports,
            features.HasEvents,
            features.MaxTables);

    /// <summary>
    /// Paket kartı verisi. Aylık ve yıllık tutarlar ile indirim burada,
    /// yani SUNUCUDA hesaplanır; frontend yalnızca gösterir.
    /// </summary>
    public static PlanOptionResponse ToOption(this PlanDefinition definition)
    {
        // Teklif usulü pakette fiyat hesaplanamaz; tutarlar sıfır gönderilir ve
        // istemci IsQuoteOnly gördüğünde "İletişime Geç" gösterir.
        if (definition.IsQuoteOnly)
        {
            return new PlanOptionResponse(
                definition.Plan, definition.Code, definition.DisplayName, definition.Summary,
                IsQuoteOnly: true, AllowsTrial: false, TrialDays: 0,
                MonthlyTotal: 0, AnnualListTotal: 0, AnnualTotal: 0, AnnualSavings: 0,
                AnnualDiscountPercent: PlanCatalog.AnnualDiscountPercent,
                PriceVersion: PlanCatalog.PriceVersion,
                Features: definition.Features.ToResponse());
        }

        var monthly = PlanCatalog.Quote(definition.Plan, 1);
        var annual = PlanCatalog.Quote(definition.Plan, PlanCatalog.AnnualPeriodMonths);

        return new PlanOptionResponse(
            definition.Plan,
            definition.Code,
            definition.DisplayName,
            definition.Summary,
            IsQuoteOnly: false,
            definition.AllowsTrial,
            definition.AllowsTrial ? PlanCatalog.TrialDays : 0,
            monthly.Total,
            annual.ListTotal,
            annual.Total,
            annual.DiscountAmount,
            annual.DiscountPercent,
            PlanCatalog.PriceVersion,
            definition.Features.ToResponse());
    }

    public static PriceQuoteResponse ToResponse(this PriceQuote quote)
        => new(
            quote.Plan,
            PlanCatalog.Get(quote.Plan).DisplayName,
            quote.BillingPeriodMonths,
            quote.ListTotal,
            quote.DiscountAmount,
            quote.DiscountPercent,
            quote.Total,
            quote.PriceVersion);
}
