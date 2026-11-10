using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using AppSukran.Domain.Subscriptions;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

public sealed class ChangePlanCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<ChangePlanCommand, Unit>
{
    public async Task<Unit> Handle(ChangePlanCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        if (request.Plan == SubscriptionPlan.Trial)
        {
            throw new InvalidOperationException("Deneme paketi doğrudan seçilemez; yalnızca kayıt sırasında verilir.");
        }

        // Enterprise'ın sabit fiyatı yoktur; doğrudan seçilemez.
        if (PlanCatalog.Get(request.Plan).IsQuoteOnly)
        {
            throw new InvalidOperationException(
                "Enterprise paketi teklif usulüdür. Lütfen bizimle iletişime geçin.");
        }

        var repository = unitOfWork.Repository<Subscription>();
        var subscriptions = await repository.FindAsync(
            subscription => subscription.RestaurantId == request.RestaurantId, cancellationToken);

        var subscription = subscriptions.FirstOrDefault()
            ?? throw new InvalidOperationException("Bu işletmeye ait abonelik kaydı bulunamadı.");

        // Tutar YALNIZCA paket koduna göre burada hesaplanır. İstemci fiyat göndermez;
        // gönderse bile kullanılmaz.
        var quote = PlanCatalog.Quote(request.Plan, request.BillingPeriodMonths);
        var amount = quote.Total;

        var now = DateTime.UtcNow;
        // Süresi henüz dolmamışsa kalan süre kaybolmasın: mevcut dönem sonundan devam et.
        var periodStart = subscription.CurrentPeriodEnd > now && subscription.Status != SubscriptionStatus.Cancelled
            ? subscription.CurrentPeriodEnd
            : now;
        var periodEnd = periodStart.AddMonths(request.BillingPeriodMonths);

        subscription.Plan = request.Plan;
        subscription.Status = SubscriptionStatus.Active;
        subscription.CurrentPeriodStart = periodStart;
        subscription.CurrentPeriodEnd = periodEnd;
        subscription.PricePerPeriod = amount;
        subscription.BillingPeriodMonths = request.BillingPeriodMonths;
        subscription.PriceVersion = quote.PriceVersion;
        subscription.MarkPaymentSucceeded(now);
        subscription.CancelledAt = null;
        subscription.Payments.Add(new SubscriptionPayment
        {
            Amount = amount,
            PaidAt = now,
            // Ödeme uygulama dışında (havale; ileride PayTR) alınır.
            Provider = "Manual",
            PeriodEnd = periodEnd,
            PriceVersion = quote.PriceVersion,
        });

        await repository.ReplaceAsync(subscription, cancellationToken);
        await auditLogService.RecordAsync(
            "SubscriptionPlanChanged", nameof(Subscription), subscription.Id,
            $"{PlanCatalog.Get(request.Plan).DisplayName} paketi, {request.BillingPeriodMonths} ay.",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
