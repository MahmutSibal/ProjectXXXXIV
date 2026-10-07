using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed class PayCustomAmountCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantPaymentGatewayResolver gatewayResolver,
    IPosBridgeService posBridgeService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    ICardNumberProtectionService cardProtectionService)
    : IRequestHandler<PayCustomAmountCommand, PaymentResultDto>
{
    public async Task<PaymentResultDto> Handle(PayCustomAmountCommand request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Amount must be greater than zero.");
        }

        var resolved = await ResolveCardAsync(request.CustomerCardId, request.CardNumber, request.PaidByUserId, cancellationToken);

        // Kart yoksa tahsilat yapılmaz. Bu yalnızca PERSONELİN nakit ödemeyi
        // sisteme işlemesi için meşrudur; QR ile bağlanan müşteri kart vermeden
        // adisyonu kapatamamalıdır (aksi hâlde QR linkine erişen herkes bedava kapatır).
        if (resolved is null)
        {
            PaymentAuthorization.EnsureCanSettleWithoutCharge(currentUserService);
        }


        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var repository = unitOfWork.Repository<Bill>();
            var bill = await repository.GetByIdAsync(request.BillId, cancellationToken)
                ?? throw new InvalidOperationException("Bill not found.");

            if (request.Amount > bill.RemainingAmount)
            {
                throw new InvalidOperationException("Amount cannot exceed remaining amount.");
            }

            // Tutarı düşmeden önce gerçek tahsilatı al; başarısızsa hiçbir değişiklik yapma.
            // Kart tahsilatı işletmenin KENDİ ödeme hesabına gider; işletme online ödemeyi
            // kapattıysa hiçbir şey yapılmadan reddedilir.
            var merchantGateway = resolved is null
                ? null
                : await gatewayResolver.ResolveAsync(bill.RestaurantId, cancellationToken);

            var chargeResult = await ChargeIfCardAsync(merchantGateway, resolved, request.BillId, bill.RestaurantId, bill.TableNo, request.Amount, request.Cvc, cancellationToken);

            bill.RemainingAmount = Math.Max(0, bill.RemainingAmount - request.Amount);
            await repository.ReplaceAsync(bill, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            var method = chargeResult is not null ? $"Card:{chargeResult.Provider}:CustomAmount" : "CustomAmount";
            await posBridgeService.NotifyPaymentCompletedAsync(new PosBridgeEvent(bill.Id, bill.RestaurantId, bill.TableNo, request.Amount, method, request.PaidByUserId), cancellationToken);
            await auditLogService.RecordAsync("PaymentCompleted", nameof(Bill), bill.Id, $"Custom amount paid: {request.Amount}. tx={chargeResult?.TransactionId ?? "-"}", currentUserService.UserId ?? request.PaidByUserId, cancellationToken);

            return new PaymentResultDto(bill.Id, request.Amount, bill.RemainingAmount, "CustomAmountPaid", chargeResult?.TransactionId, chargeResult?.Provider);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static async Task<ChargeResult?> ChargeIfCardAsync(IPaymentGateway? paymentGateway, (CustomerCard Card, string Pan)? resolved, string billId, string restaurantId, int tableNo, long amount, string? cvc, CancellationToken cancellationToken)
    {
        if (resolved is null || paymentGateway is null)
        {
            return null;
        }

        var (card, pan) = resolved.Value;
        var result = await paymentGateway.ChargeAsync(
            new ChargeRequest(billId, restaurantId, tableNo, amount, card.UserId,
                new PaymentCard(card.CardholderName, pan, card.ExpiryMonth, card.ExpiryYear, cvc, card.Brand, card.Last4),
                UseRestaurantMerchant: true),
            cancellationToken);

        if (!result.Success)
        {
            throw new InvalidOperationException($"Ödeme başarısız: {result.ErrorMessage}");
        }

        return result;
    }

    private async Task<(CustomerCard Card, string Pan)?> ResolveCardAsync(string? customerCardId, string? cardNumber, string paidByUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(customerCardId) && string.IsNullOrWhiteSpace(cardNumber))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(customerCardId) || string.IsNullOrWhiteSpace(cardNumber))
        {
            throw new InvalidOperationException("Card information is incomplete.");
        }

        var card = await unitOfWork.Repository<CustomerCard>().GetByIdAsync(customerCardId, cancellationToken)
            ?? throw new InvalidOperationException("Card not found.");

        var currentUserId = currentUserService.UserId ?? paidByUserId;
        if (card.UserId != currentUserId)
        {
            throw new InvalidOperationException("Card does not belong to the current user.");
        }

        if (!card.IsActive || !cardProtectionService.VerifyCardNumber(cardNumber, card.CardHash))
        {
            throw new InvalidOperationException("Card verification failed.");
        }

        return (card, cardProtectionService.NormalizeCardNumber(cardNumber));
    }
}
