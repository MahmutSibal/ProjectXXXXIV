using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed class DeleteBillCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<DeleteBillCommand, Unit>
{
    public async Task<Unit> Handle(DeleteBillCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Bill>();
        var bill = await repository.GetByIdAsync(request.BillId, cancellationToken)
            ?? throw new InvalidOperationException("Bill not found.");

        restaurantAccessGuard.EnsureCanAccess(bill.RestaurantId);
        await repository.DeleteAsync(request.BillId, cancellationToken);
        await auditLogService.RecordAsync("BillDeleted", nameof(Bill), request.BillId, "Bill deleted.", currentUserService.UserId, cancellationToken);
        return Unit.Value;
    }
}