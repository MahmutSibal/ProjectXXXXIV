using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Models;

public sealed record SubscriptionResponse(
    string Id,
    string RestaurantId,
    SubscriptionPlan Plan,
    string PlanName,
    SubscriptionStatus Status,
    DateTime CurrentPeriodStart,
    DateTime CurrentPeriodEnd,
    DateTime? TrialEndsAt,
    long PricePerPeriod,
    int BillingPeriodMonths,
    DateTime? LastPaymentAt,
    bool GrantsAccess,
    int DaysRemaining,
    /// <summary>İptal edildi ama ödenmiş dönem henüz sürüyor.</summary>
    bool IsCancelledButStillActive,
    /// <summary>Ödeme bekleniyorsa erişimin kesileceği tarih.</summary>
    DateTime? GraceEndsAt,
    int PaymentFailureCount,
    string? LastPaymentError,
    /// <summary>Otomatik yenileme açık mı?</summary>
    bool AutoRenew,
    /// <summary>Saklı kartın son 4 hanesi (kart numarası saklanmaz).</summary>
    string? PaymentMethodLast4,
    string? PaymentMethodBrand,
    int? MaxTables,
    bool HasStaffPanels,
    bool HasDetailedReports,
    bool HasEvents,
    IReadOnlyCollection<SubscriptionPaymentResponse> Payments);

public sealed record SubscriptionPaymentResponse(
    string Id,
    long Amount,
    DateTime PaidAt,
    string? TransactionId,
    string Provider,
    DateTime PeriodEnd);

/// <summary>
/// Paket kartının göstereceği HER ŞEY. Frontend fiyat veya limit hesaplamaz;
/// yalnızca buradaki değerleri gösterir.
/// </summary>
/// <param name="MonthlyTotal">Aylık seçimde tahsil edilecek tutar (kuruş).</param>
/// <param name="AnnualListTotal">Yıllık indirim uygulanmadan önceki tutar (üstü çizili gösterilir).</param>
/// <param name="AnnualTotal">Yıllık seçimde tahsil edilecek tutar.</param>
/// <param name="AnnualSavings">Yıllıkta kazanılan tutar.</param>
/// <param name="IsQuoteOnly">Fiyat yerine "İletişime Geç" gösterilir.</param>
public sealed record PlanOptionResponse(
    SubscriptionPlan Plan,
    string Code,
    string DisplayName,
    string Summary,
    bool IsQuoteOnly,
    bool AllowsTrial,
    int TrialDays,
    long MonthlyTotal,
    long AnnualListTotal,
    long AnnualTotal,
    long AnnualSavings,
    int AnnualDiscountPercent,
    string PriceVersion,
    PlanFeaturesResponse Features);

public sealed record PlanFeaturesResponse(
    bool HasQrMenu,
    bool HasOrdering,
    int? MaxQrOrdersPerPeriod,
    int? MaxKitchenPanels,
    int? MaxWaiterPanels,
    bool HasStaffPanels,
    bool HasDetailedReports,
    bool HasEvents,
    int? MaxTables);

/// <summary>Belirli bir paket + dönem için backend'in hesapladığı fiyat.</summary>
public sealed record PriceQuoteResponse(
    SubscriptionPlan Plan,
    string PlanName,
    int BillingPeriodMonths,
    long ListTotal,
    long DiscountAmount,
    int DiscountPercent,
    long Total,
    string PriceVersion);
