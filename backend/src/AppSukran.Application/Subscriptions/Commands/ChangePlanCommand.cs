using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>
/// Paket seçimi/yükseltme. Abonelik aktifleşir ve dönem, seçilen faturalama
/// periyodu kadar ileri taşınır. Ödeme uygulama dışında (havale; ileride PayTR)
/// alınır ve "Manual" olarak kaydedilir.
/// </summary>
public sealed record ChangePlanCommand(
    string RestaurantId,
    SubscriptionPlan Plan,
    int BillingPeriodMonths) : IRequest<Unit>;
