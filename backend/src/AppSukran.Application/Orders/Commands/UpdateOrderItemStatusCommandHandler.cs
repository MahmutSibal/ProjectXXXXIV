using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed class UpdateOrderItemStatusCommandHandler(IUnitOfWork unitOfWork, IOrderRealtimePublisher orderRealtimePublisher, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<UpdateOrderItemStatusCommand, Unit>
{
    public async Task<Unit> Handle(UpdateOrderItemStatusCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Order>();
        var order = await repository.GetByIdAsync(request.OrderId, cancellationToken)
            ?? throw new InvalidOperationException("Order not found.");

        restaurantAccessGuard.EnsureCanAccess(order.RestaurantId);

        var item = order.Items.FirstOrDefault(orderItem => orderItem.OrderItemId == request.OrderItemId)
            ?? throw new InvalidOperationException("Order item not found.");

        if (item.PaymentStatus != PaymentStatus.Unpaid)
        {
            throw new InvalidOperationException("Paid or processing items cannot be modified.");
        }

        item.Status = request.Status;
        await repository.ReplaceAsync(order, cancellationToken);
        await orderRealtimePublisher.PublishOrderUpdatedAsync(order, cancellationToken);
        await auditLogService.RecordAsync("OrderItemStatusUpdated", nameof(OrderItem), item.OrderItemId, $"Status changed to {request.Status}.", currentUserService.UserId, cancellationToken);
        return Unit.Value;
    }
}