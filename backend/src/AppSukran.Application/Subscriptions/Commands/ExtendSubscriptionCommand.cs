using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>
/// SuperAdmin'in bir aboneliği elle uzatması/düzenlemesi. Havale ile ödeme alınan
/// veya destek amaçlı süre verilen durumlar için kullanılır.
/// </summary>
public sealed record ExtendSubscriptionCommand(
    string RestaurantId,
    SubscriptionPlan Plan,
    int Months,
    long? RecordedAmount,
    string? Note) : IRequest<Unit>;
