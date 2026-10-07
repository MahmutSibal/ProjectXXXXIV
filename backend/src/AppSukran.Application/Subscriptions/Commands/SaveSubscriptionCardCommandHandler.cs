using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

public sealed class SaveSubscriptionCardCommandHandler(
    IUnitOfWork unitOfWork,
    IPaymentGateway paymentGateway,
    IRestaurantAccessGuard restaurantAccessGuard,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService)
    : IRequestHandler<SaveSubscriptionCardCommand, SubscriptionResponse>
{
    public async Task<SubscriptionResponse> Handle(
        SaveSubscriptionCardCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var repository = unitOfWork.Repository<Subscription>();
        var subscription = (await repository.FindAsync(
                candidate => candidate.RestaurantId == request.RestaurantId, cancellationToken))
            .FirstOrDefault()
            ?? throw new InvalidOperationException("Bu işletmeye ait abonelik kaydı bulunamadı.");

        var expiry = new DateTime(request.ExpiryYear, Math.Clamp(request.ExpiryMonth, 1, 12), 1).AddMonths(1);
        if (expiry <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Kartın son kullanma tarihi geçmiş.");
        }

        var email = currentUserService.Email ?? $"{request.RestaurantId}@sukranapp.com";

        var stored = await paymentGateway.StoreCardAsync(
            new StoreCardRequest(
                request.RestaurantId,
                email,
                request.CardHolderName.Trim(),
                request.CardNumber,
                request.ExpiryMonth,
                request.ExpiryYear,
                "Abonelik Kartı"),
            cancellationToken);

        if (!stored.Success)
        {
            throw new InvalidOperationException(stored.ErrorMessage ?? "Kart kaydedilemedi.");
        }

        subscription.PaymentMethodUserKey = stored.CardUserKey;
        subscription.PaymentMethodToken = stored.CardToken;
        subscription.PaymentMethodLast4 = stored.Last4;
        subscription.PaymentMethodBrand = stored.Brand;
        subscription.AutoRenew = true;

        // Kart güncellendiğinde hata sayacı sıfırlanır: yeni kartla yeniden denenmeli.
        subscription.PaymentFailureCount = 0;
        subscription.LastPaymentError = null;

        await repository.ReplaceAsync(subscription, cancellationToken);

        // Denetim kaydına kart numarası YAZILMAZ; yalnızca son 4 hane.
        await auditLogService.RecordAsync(
            "SubscriptionCardSaved", nameof(Subscription), subscription.Id,
            $"Abonelik kartı tanımlandı (•••• {stored.Last4}). Otomatik yenileme açık.",
            currentUserService.UserId, cancellationToken);

        return subscription.ToResponse();
    }
}
