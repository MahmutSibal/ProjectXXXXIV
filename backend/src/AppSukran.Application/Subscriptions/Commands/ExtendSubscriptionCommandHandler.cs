using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

public sealed class ExtendSubscriptionCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService) : IRequestHandler<ExtendSubscriptionCommand, Unit>
{
    public async Task<Unit> Handle(ExtendSubscriptionCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Subscription>();
        var subscriptions = await repository.FindAsync(
            subscription => subscription.RestaurantId == request.RestaurantId, cancellationToken);

        var now = DateTime.UtcNow;
        var subscription = subscriptions.FirstOrDefault();

        if (subscription is null)
        {
            subscription = new Subscription
            {
                RestaurantId = request.RestaurantId,
                CurrentPeriodStart = now,
                CurrentPeriodEnd = now,
            };
            await repository.InsertAsync(subscription, cancellationToken);
        }

        var periodStart = subscription.CurrentPeriodEnd > now ? subscription.CurrentPeriodEnd : now;
        var periodEnd = periodStart.AddMonths(request.Months);

        subscription.Plan = request.Plan;
        subscription.Status = SubscriptionStatus.Active;
        subscription.CurrentPeriodStart = periodStart;
        subscription.CurrentPeriodEnd = periodEnd;
        subscription.BillingPeriodMonths = request.Months;
        subscription.PricePerPeriod = request.RecordedAmount ?? PlanCatalog.PriceFor(request.Plan, request.Months);
        subscription.CancelledAt = null;

        if (request.RecordedAmount is > 0)
        {
            subscription.LastPaymentAt = now;
            subscription.Payments.Add(new SubscriptionPayment
            {
                Amount = request.RecordedAmount.Value,
                PaidAt = now,
                Provider = "Manual",
                PeriodEnd = periodEnd,
                TransactionId = null,
            });
        }

        await repository.ReplaceAsync(subscription, cancellationToken);
        await auditLogService.RecordAsync(
            "SubscriptionExtended", nameof(Subscription), subscription.Id,
            $"{PlanCatalog.Get(request.Plan).DisplayName}, +{request.Months} ay. {request.Note}".Trim(),
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
