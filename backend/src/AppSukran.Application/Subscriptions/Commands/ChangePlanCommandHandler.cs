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
    IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<ChangePlanCommand, ChangePlanResult>
{
    public async Task<ChangePlanResult> Handle(ChangePlanCommand request, CancellationToken cancellationToken)
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
        var planName = PlanCatalog.Get(request.Plan).DisplayName;

        // Ödeme alınmadan paket açılamaz. Ödeme altyapısı (PayTR) bağlanana kadar
        // işletme sahibinin seçimi SuperAdmin'e talep olarak iletilir.
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken);
            var owner = currentUserService.UserId is { } ownerId
                ? await unitOfWork.Repository<User>().GetByIdAsync(ownerId, cancellationToken)
                : null;

            await unitOfWork.Repository<SupportRequest>().InsertAsync(new SupportRequest
            {
                RestaurantId = request.RestaurantId,
                CreatedByUserId = currentUserService.UserId,
                BusinessName = restaurant?.Name ?? "İşletme",
                Topic = "Paket talebi",
                Content = $"{planName} paketi, {request.BillingPeriodMonths} ay. Tutar: {amount / 100m:N2} TL. " +
                          "Ödeme alındıktan sonra Abonelikler ekranından süre uzatılarak aktifleştirilmeli.",
                Phone = owner?.Phone ?? string.Empty,
                IsCalled = false,
            }, cancellationToken);

            await auditLogService.RecordAsync(
                "SubscriptionPlanRequested", nameof(Subscription), subscription.Id,
                $"{planName} paketi, {request.BillingPeriodMonths} ay talep edildi.",
                currentUserService.UserId, cancellationToken);

            return new ChangePlanResult(false,
                $"{planName} paketi talebiniz alındı. Ödeme bilgileri için ekibimiz sizinle iletişime geçecek; " +
                "ödeme onaylanınca paketiniz aktifleşir.");
        }

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
            $"{planName} paketi, {request.BillingPeriodMonths} ay.",
            currentUserService.UserId, cancellationToken);

        return new ChangePlanResult(true, $"{planName} paketi aktifleştirildi.");
    }
}
