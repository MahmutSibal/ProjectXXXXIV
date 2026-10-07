using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>
/// Paket seçimi/yükseltme. Ödeme başarılı olursa abonelik aktifleşir ve
/// dönem, seçilen faturalama periyodu kadar ileri taşınır.
/// </summary>
public sealed record ChangePlanCommand(
    string RestaurantId,
    SubscriptionPlan Plan,
    int BillingPeriodMonths,
    string? CustomerCardId = null,
    string? CardNumber = null,
    string? Cvc = null) : IRequest<Unit>;
