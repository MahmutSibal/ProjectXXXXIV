using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using MediatR;

namespace AppSukran.Application.Subscriptions.Queries;

public sealed class GetSubscriptionQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<GetSubscriptionQuery, SubscriptionResponse?>
{
    public async Task<SubscriptionResponse?> Handle(GetSubscriptionQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var subscriptions = await unitOfWork.Repository<Subscription>()
            .FindAsync(subscription => subscription.RestaurantId == request.RestaurantId, cancellationToken);

        return subscriptions.FirstOrDefault()?.ToResponse();
    }
}

public sealed class GetAllSubscriptionsQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetAllSubscriptionsQuery, IReadOnlyCollection<SubscriptionResponse>>
{
    public async Task<IReadOnlyCollection<SubscriptionResponse>> Handle(GetAllSubscriptionsQuery request, CancellationToken cancellationToken)
    {
        var subscriptions = await unitOfWork.Repository<Subscription>().GetAllAsync(cancellationToken);
        return subscriptions
            .OrderBy(subscription => subscription.CurrentPeriodEnd)
            .Select(subscription => subscription.ToResponse())
            .ToList();
    }
}

public sealed class GetPlanOptionsQueryHandler : IRequestHandler<GetPlanOptionsQuery, IReadOnlyCollection<PlanOptionResponse>>
{
    public Task<IReadOnlyCollection<PlanOptionResponse>> Handle(GetPlanOptionsQuery request, CancellationToken cancellationToken)
    {
        // Deneme paketi satın alınamaz, listelenmez. Fiyat/indirim hesapları
        // ToOption() içinde, yani sunucuda yapılır.
        IReadOnlyCollection<PlanOptionResponse> options = PlanCatalog.Purchasable
            .Select(definition => definition.ToOption())
            .ToList();

        return Task.FromResult(options);
    }
}

public sealed class GetPriceQuoteQueryHandler : IRequestHandler<GetPriceQuoteQuery, PriceQuoteResponse>
{
    public Task<PriceQuoteResponse> Handle(GetPriceQuoteQuery request, CancellationToken cancellationToken)
    {
        if (request.Plan == SubscriptionPlan.Trial)
        {
            throw new InvalidOperationException("Deneme paketi için fiyat hesaplanmaz.");
        }

        // Enterprise'da Quote() zaten anlamlı bir hata fırlatır.
        return Task.FromResult(PlanCatalog.Quote(request.Plan, request.BillingPeriodMonths).ToResponse());
    }
}
