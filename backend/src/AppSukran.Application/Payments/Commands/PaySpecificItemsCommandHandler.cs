using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed class PaySpecificItemsCommandHandler(
    IUnitOfWork unitOfWork,
    IPosBridgeService posBridgeService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<PaySpecificItemsCommand, PaymentResultDto>
{
    public async Task<PaymentResultDto> Handle(PaySpecificItemsCommand request, CancellationToken cancellationToken)
    {
        // Yalnızca personel: müşteri kartla PayTR üzerinden öder.
        PaymentAuthorization.EnsureCanSettleWithoutCharge(currentUserService);

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var repository = unitOfWork.Repository<Bill>();
            var bill = await repository.GetByIdAsync(request.BillId, cancellationToken)
                ?? throw new InvalidOperationException("Bill not found.");

            PaymentAuthorization.EnsureCanAccessBill(bill.RestaurantId, bill.TableNo, restaurantAccessGuard, currentUserService);

            var selected = bill.Items.Where(item => request.ItemIds.Contains(item.OrderItemId)).ToList();
            if (selected.Count == 0)
            {
                throw new InvalidOperationException("No matching items found.");
            }

            // Kartla ödemesi süren (Processing) ya da ödenmiş kalem tekrar işlenmez.
            if (selected.Any(item => item.PaymentStatus != PaymentStatus.Unpaid))
            {
                throw new InvalidOperationException("One or more items are already being processed or paid.");
            }

            var paid = BillPayments.ApplyItems(bill, request.ItemIds, PaymentStatus.Unpaid);
            await repository.ReplaceAsync(bill, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            await posBridgeService.NotifyPaymentCompletedAsync(new PosBridgeEvent(bill.Id, bill.RestaurantId, bill.TableNo, paid, "Manual:SpecificItems", request.PaidByUserId), cancellationToken);
            await auditLogService.RecordAsync("PaymentCompleted", nameof(Bill), bill.Id, $"Masada ödendi ({selected.Count} kalem): {paid}.", currentUserService.UserId ?? request.PaidByUserId, cancellationToken);

            return new PaymentResultDto(bill.Id, paid, bill.RemainingAmount, "SpecificItemsPaid");
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
