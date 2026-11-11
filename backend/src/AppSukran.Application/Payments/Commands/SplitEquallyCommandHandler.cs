using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed class SplitEquallyCommandHandler(
    IUnitOfWork unitOfWork,
    IPosBridgeService posBridgeService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<SplitEquallyCommand, PaymentResultDto>
{
    public async Task<PaymentResultDto> Handle(SplitEquallyCommand request, CancellationToken cancellationToken)
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

            if (bill.RemainingAmount <= 0)
            {
                throw new InvalidOperationException("There is no remaining amount to split.");
            }

            var share = bill.RemainingAmount / request.PersonCount;
            if (share <= 0)
            {
                throw new InvalidOperationException("Calculated share is invalid.");
            }

            var paid = BillPayments.ApplyAmount(bill, share);
            await repository.ReplaceAsync(bill, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            await posBridgeService.NotifyPaymentCompletedAsync(new PosBridgeEvent(bill.Id, bill.RestaurantId, bill.TableNo, paid, "Manual:SplitEqually", request.PaidByUserId), cancellationToken);
            await auditLogService.RecordAsync("PaymentCompleted", nameof(Bill), bill.Id, $"Masada ödendi ({request.PersonCount} kişiye bölündü): {paid}.", currentUserService.UserId ?? request.PaidByUserId, cancellationToken);

            return new PaymentResultDto(bill.Id, paid, bill.RemainingAmount, "SplitEquallyPaid");
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
