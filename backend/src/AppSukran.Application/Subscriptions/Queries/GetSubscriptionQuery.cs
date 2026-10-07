using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Subscriptions.Queries;

/// <summary>Bir restoranın abonelik durumunu getirir.</summary>
public sealed record GetSubscriptionQuery(string RestaurantId) : IRequest<SubscriptionResponse?>;

/// <summary>Tüm abonelikleri listeler (SuperAdmin).</summary>
public sealed record GetAllSubscriptionsQuery : IRequest<IReadOnlyCollection<SubscriptionResponse>>;

/// <summary>Satın alınabilir paketleri listeler.</summary>
public sealed record GetPlanOptionsQuery : IRequest<IReadOnlyCollection<PlanOptionResponse>>;
