using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
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
    IPaymentGateway paymentGateway,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    ICardNumberProtectionService cardProtectionService,
    IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<ChangePlanCommand, Unit>
{
    public async Task<Unit> Handle(ChangePlanCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        if (request.Plan == SubscriptionPlan.Trial)
        {
            throw new InvalidOperationException("Deneme paketi doğrudan seçilemez; yalnızca kayıt sırasında verilir.");
        }

        // Enterprise'ın sabit fiyatı yoktur; otomatik tahsilatla satın alınamaz.
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

        // Tahsilatı önce al; başarısızsa aboneliğe hiç dokunma.
        var chargeResult = await ChargeAsync(request, subscription, amount, cancellationToken);

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
            TransactionId = chargeResult?.TransactionId,
            Provider = chargeResult?.Provider ?? "Manual",
            PeriodEnd = periodEnd,
            PriceVersion = quote.PriceVersion,
        });

        await repository.ReplaceAsync(subscription, cancellationToken);
        await auditLogService.RecordAsync(
            "SubscriptionPlanChanged", nameof(Subscription), subscription.Id,
            $"{PlanCatalog.Get(request.Plan).DisplayName} paketi, {request.BillingPeriodMonths} ay. tx={chargeResult?.TransactionId ?? "-"}",
            currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }

    private async Task<ChargeResult?> ChargeAsync(
        ChangePlanCommand request, Subscription subscription, long amount, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerCardId) || string.IsNullOrWhiteSpace(request.CardNumber))
        {
            // Kart verilmediyse ödeme dışarıda (havale/elden) alınmış kabul edilir.
            return null;
        }

        var card = await unitOfWork.Repository<CustomerCard>().GetByIdAsync(request.CustomerCardId, cancellationToken)
            ?? throw new InvalidOperationException("Kart bulunamadı.");

        if (card.UserId != currentUserService.UserId)
        {
            throw new UnauthorizedAccessException("Bu kart size ait değil.");
        }

        if (!card.IsActive || !cardProtectionService.VerifyCardNumber(request.CardNumber, card.CardHash))
        {
            throw new InvalidOperationException("Kart doğrulaması başarısız.");
        }

        var result = await paymentGateway.ChargeAsync(
            new ChargeRequest(
                subscription.Id,
                subscription.RestaurantId,
                0,
                amount,
                currentUserService.UserId ?? card.UserId,
                new PaymentCard(
                    card.CardholderName,
                    cardProtectionService.NormalizeCardNumber(request.CardNumber),
                    card.ExpiryMonth,
                    card.ExpiryYear,
                    request.Cvc,
                    card.Brand,
                    card.Last4)),
            cancellationToken);

        if (!result.Success)
        {
            // Başarısız denemeyi aboneliğe yaz: gecikme takibi ve hatırlatma
            // kararları bu bilgiye dayanır. Abonelik durumu değiştirilmez —
            // kullanıcı hâlâ mevcut dönemini kullanıyor olabilir.
            subscription.MarkPaymentFailed(DateTime.UtcNow, result.ErrorMessage ?? "Ödeme reddedildi.");
            await unitOfWork.Repository<Subscription>().ReplaceAsync(subscription, cancellationToken);

            throw new InvalidOperationException($"Abonelik ödemesi başarısız: {result.ErrorMessage}");
        }

        return result;
    }
}
