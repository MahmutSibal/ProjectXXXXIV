using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

public sealed class StartTrialCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService) : IRequestHandler<StartTrialCommand, string>
{
    public async Task<string> Handle(StartTrialCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Subscription>();

        var existing = await repository.FindAsync(
            subscription => subscription.RestaurantId == request.RestaurantId, cancellationToken);
        if (existing.Count > 0)
        {
            // Zaten bir aboneliği var; yeni deneme açılmaz.
            return existing.First().Id;
        }

        var now = DateTime.UtcNow;
        var trialEnd = now.AddDays(PlanCatalog.TrialDays);

        var subscription = new Subscription
        {
            RestaurantId = request.RestaurantId,
            Plan = SubscriptionPlan.Trial,
            Status = SubscriptionStatus.Trialing,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = trialEnd,
            TrialEndsAt = trialEnd,
            PricePerPeriod = 0,
            BillingPeriodMonths = 1,
        };

        await repository.InsertAsync(subscription, cancellationToken);
        await auditLogService.RecordAsync(
            "TrialStarted", nameof(Subscription), subscription.Id,
            $"{PlanCatalog.TrialDays} günlük deneme başlatıldı. Restoran {request.RestaurantId}.",
            currentUserService.UserId, cancellationToken);

        return subscription.Id;
    }
}
