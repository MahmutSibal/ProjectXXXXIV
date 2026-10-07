using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed class DeleteOrderCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<DeleteOrderCommand, Unit>
{
    public async Task<Unit> Handle(DeleteOrderCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Order>();
        var order = await repository.GetByIdAsync(request.OrderId, cancellationToken)
            ?? throw new InvalidOperationException("Order not found.");

        restaurantAccessGuard.EnsureCanAccess(order.RestaurantId);
        await repository.DeleteAsync(request.OrderId, cancellationToken);
        await auditLogService.RecordAsync("OrderDeleted", nameof(Order), request.OrderId, "Order deleted.", currentUserService.UserId, cancellationToken);
        return Unit.Value;
    }
}