using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Payments.Commands;

public sealed class PayCustomAmountCommandHandler(
    IUnitOfWork unitOfWork,
    IPosBridgeService posBridgeService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<PayCustomAmountCommand, PaymentResultDto>
{
    public async Task<PaymentResultDto> Handle(PayCustomAmountCommand request, CancellationToken cancellationToken)
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

            if (request.Amount > bill.RemainingAmount)
            {
                throw new InvalidOperationException("Amount cannot exceed remaining amount.");
            }

            var paid = BillPayments.ApplyAmount(bill, request.Amount);
            await repository.ReplaceAsync(bill, cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            await posBridgeService.NotifyPaymentCompletedAsync(new PosBridgeEvent(bill.Id, bill.RestaurantId, bill.TableNo, paid, "Manual:CustomAmount", request.PaidByUserId), cancellationToken);
            await auditLogService.RecordAsync("PaymentCompleted", nameof(Bill), bill.Id, $"Masada ödendi (tutar): {paid}.", currentUserService.UserId ?? request.PaidByUserId, cancellationToken);

            return new PaymentResultDto(bill.Id, paid, bill.RemainingAmount, "CustomAmountPaid");
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
