using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed class UpdateOrderStatusCommandHandler(IUnitOfWork unitOfWork, IOrderRealtimePublisher orderRealtimePublisher, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<UpdateOrderStatusCommand, Unit>
{
    public async Task<Unit> Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Order>();
        var order = await repository.GetByIdAsync(request.OrderId, cancellationToken)
            ?? throw new InvalidOperationException("Order not found.");

        restaurantAccessGuard.EnsureCanAccess(order.RestaurantId);
        order.SessionStatus = request.SessionStatus;
        await repository.ReplaceAsync(order, cancellationToken);
        await orderRealtimePublisher.PublishOrderUpdatedAsync(order, cancellationToken);
        await auditLogService.RecordAsync("OrderStatusUpdated", nameof(Order), order.Id, $"Status changed to {request.SessionStatus}.", currentUserService.UserId, cancellationToken);
        return Unit.Value;
    }
}