using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed class UpdateBillCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<UpdateBillCommand, Unit>
{
    public async Task<Unit> Handle(UpdateBillCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Bill>();
        var bill = await repository.GetByIdAsync(request.BillId, cancellationToken)
            ?? throw new InvalidOperationException("Bill not found.");

        restaurantAccessGuard.EnsureCanAccess(bill.RestaurantId);
        bill.SessionStatus = request.SessionStatus;
        bill.RemainingAmount = request.RemainingAmount;
        await repository.ReplaceAsync(bill, cancellationToken);
        await auditLogService.RecordAsync("BillUpdated", nameof(Bill), bill.Id, $"Status changed to {request.SessionStatus}, remaining amount {request.RemainingAmount}.", currentUserService.UserId, cancellationToken);
        return Unit.Value;
    }
}