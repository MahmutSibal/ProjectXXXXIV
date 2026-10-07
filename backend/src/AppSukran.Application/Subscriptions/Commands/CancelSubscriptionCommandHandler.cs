using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

public sealed class CancelSubscriptionCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<CancelSubscriptionCommand, Unit>
{
    public async Task<Unit> Handle(CancelSubscriptionCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var repository = unitOfWork.Repository<Subscription>();
        var subscriptions = await repository.FindAsync(
            subscription => subscription.RestaurantId == request.RestaurantId, cancellationToken);

        var subscription = subscriptions.FirstOrDefault()
            ?? throw new InvalidOperationException("Bu işletmeye ait abonelik kaydı bulunamadı.");

        subscription.Status = SubscriptionStatus.Cancelled;
        subscription.CancelledAt = DateTime.UtcNow;

        // İptalin anlamı: ödenmiş dönem sonuna kadar hizmet sürer, ama SONRAKİ
        // otomatik tahsilat yapılmaz. Bunu kapatmazsak müşteri iptal etmesine
        // rağmen kartından çekmeye devam ederdik.
        subscription.AutoRenew = false;

        await repository.ReplaceAsync(subscription, cancellationToken);
        await auditLogService.RecordAsync(
            "SubscriptionCancelled", nameof(Subscription), subscription.Id,
            $"Abonelik iptal edildi. Hizmet {subscription.CurrentPeriodEnd:yyyy-MM-dd} tarihine kadar sürecek.",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}
