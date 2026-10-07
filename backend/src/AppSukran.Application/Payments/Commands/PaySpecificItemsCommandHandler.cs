using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed class PaySpecificItemsCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantPaymentGatewayResolver gatewayResolver,
    IPosBridgeService posBridgeService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    ICardNumberProtectionService cardProtectionService)
    : IRequestHandler<PaySpecificItemsCommand, PaymentResultDto>
{
    public async Task<PaymentResultDto> Handle(PaySpecificItemsCommand request, CancellationToken cancellationToken)
    {
        // Kart bilgisi varsa sahibi/aktifliği doğrula; kart yoksa nakit/masada ödeme demektir.
        var resolved = await ResolveCardAsync(request.CustomerCardId, request.CardNumber, request.PaidByUserId, cancellationToken);

        // Kart yoksa tahsilat yapılmaz. Bu yalnızca PERSONELİN nakit ödemeyi
        // sisteme işlemesi için meşrudur; QR ile bağlanan müşteri kart vermeden
        // adisyonu kapatamamalıdır (aksi hâlde QR linkine erişen herkes bedava kapatır).
        if (resolved is null)
        {
            PaymentAuthorization.EnsureCanSettleWithoutCharge(currentUserService);
        }


        // ---- Faz 1: seçili kalemleri "Processing" olarak rezerve et (eşzamanlı çifte ödemeyi önler) ----
        string restaurantId;
        int tableNo;
        long reservedAmount;
        IPaymentGateway? merchantGateway = null;
        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var repository = unitOfWork.Repository<Bill>();
            var bill = await repository.GetByIdAsync(request.BillId, cancellationToken)
                ?? throw new InvalidOperationException("Bill not found.");

            var selectedItems = bill.Items.Where(item => request.ItemIds.Contains(item.OrderItemId)).ToList();
            if (selectedItems.Count == 0)
            {
                throw new InvalidOperationException("No matching items found.");
            }

            if (selectedItems.Any(item => item.PaymentStatus != PaymentStatus.Unpaid))
            {
                throw new InvalidOperationException("One or more items are already being processed or paid.");
            }

            // Kart tahsilatı işletmenin KENDİ ödeme hesabına gider; işletme online ödemeyi
            // kapattıysa kalemler rezerve edilmeden reddedilir.
            if (resolved is not null)
            {
                merchantGateway = await gatewayResolver.ResolveAsync(bill.RestaurantId, cancellationToken);
            }

            restaurantId = bill.RestaurantId;
            tableNo = bill.TableNo;
            reservedAmount = selectedItems.Sum(item => item.Price);
            foreach (var item in selectedItems)
            {
                item.PaymentStatus = PaymentStatus.Processing;
            }

            await repository.ReplaceAsync(bill, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        // ---- Faz 2: gerçek tahsilat + kalıcı "Paid" ----
        ChargeResult? chargeResult = null;
        if (resolved is not null)
        {
            var (card, pan) = resolved.Value;
            chargeResult = await merchantGateway!.ChargeAsync(
                new ChargeRequest(request.BillId, restaurantId, tableNo, reservedAmount, request.PaidByUserId,
                    new PaymentCard(card.CardholderName, pan, card.ExpiryMonth, card.ExpiryYear, request.Cvc, card.Brand, card.Last4),
                    UseRestaurantMerchant: true),
                cancellationToken);

            if (!chargeResult.Success)
            {
                await RevertReservationAsync(request.BillId, request.ItemIds, cancellationToken);
                throw new InvalidOperationException($"Ödeme başarısız: {chargeResult.ErrorMessage}");
            }
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var repository = unitOfWork.Repository<Bill>();
            var lockedBill = await repository.GetByIdAsync(request.BillId, cancellationToken)
                ?? throw new InvalidOperationException("Bill not found.");

            var lockedItems = lockedBill.Items.Where(item => request.ItemIds.Contains(item.OrderItemId)).ToList();
            if (lockedItems.Any(item => item.PaymentStatus != PaymentStatus.Processing))
            {
                throw new InvalidOperationException("One or more items are no longer in processing state.");
            }

            var paidAmount = lockedItems.Sum(item => item.Price);
            lockedBill.RemainingAmount = Math.Max(0, lockedBill.RemainingAmount - paidAmount);
            foreach (var item in lockedItems)
            {
                item.PaymentStatus = PaymentStatus.Paid;
            }

            await repository.ReplaceAsync(lockedBill, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            var method = chargeResult is not null ? $"Card:{chargeResult.Provider}:SpecificItems" : "SpecificItems";
            await posBridgeService.NotifyPaymentCompletedAsync(new PosBridgeEvent(lockedBill.Id, lockedBill.RestaurantId, lockedBill.TableNo, paidAmount, method, request.PaidByUserId), cancellationToken);
            await auditLogService.RecordAsync("PaymentCompleted", nameof(Bill), lockedBill.Id, $"Specific items paid: {string.Join(',', request.ItemIds)}. tx={chargeResult?.TransactionId ?? "-"}", currentUserService.UserId ?? request.PaidByUserId, cancellationToken);

            return new PaymentResultDto(lockedBill.Id, paidAmount, lockedBill.RemainingAmount, PaymentStatus.Paid.ToString(), chargeResult?.TransactionId, chargeResult?.Provider);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            // Tahsilat alındıysa kalemler "Processing"te kalır; izlenebilmesi için audit'e düş.
            await auditLogService.RecordAsync("PaymentSettleFailed", nameof(Bill), request.BillId, $"Charge tx={chargeResult?.TransactionId ?? "-"} ama 'Paid' yazılamadı.", currentUserService.UserId ?? request.PaidByUserId, cancellationToken);
            throw;
        }
    }

    private async Task RevertReservationAsync(string billId, IReadOnlyCollection<string> itemIds, CancellationToken cancellationToken)
    {
        try
        {
            await unitOfWork.BeginTransactionAsync(cancellationToken);
            var repository = unitOfWork.Repository<Bill>();
            var bill = await repository.GetByIdAsync(billId, cancellationToken);
            if (bill is not null)
            {
                foreach (var item in bill.Items.Where(i => itemIds.Contains(i.OrderItemId) && i.PaymentStatus == PaymentStatus.Processing))
                {
                    item.PaymentStatus = PaymentStatus.Unpaid;
                }
                await repository.ReplaceAsync(bill, cancellationToken);
            }
            await unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
        }
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
