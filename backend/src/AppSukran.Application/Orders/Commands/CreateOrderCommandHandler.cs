using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed class CreateOrderCommandHandler(IUnitOfWork unitOfWork, IOrderRealtimePublisher orderRealtimePublisher, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard, ISubscriptionGuard subscriptionGuard)
    : IRequestHandler<CreateOrderCommand, string>
{
    public async Task<string> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);
        // Aboneliği biten işletmede yeni sipariş alınamaz.
        // Paketin sipariş sistemi içerip içermediğini ve dönemlik QR sipariş
        // limitini de denetler (Lite'ta sipariş alınamaz).
        await subscriptionGuard.EnsureCanCreateOrderAsync(request.RestaurantId, cancellationToken);

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo)
            ?? throw new InvalidOperationException("Table not found.");

        if (table.Status != RestaurantTableStatus.Occupied ||
            table.TableSessionId != request.TableSessionId ||
            table.QrToken != request.QrToken ||
            table.SessionClosedAt.HasValue)
        {
            throw new InvalidOperationException("Invalid or expired table session.");
        }

        var order = new Order
        {
            RestaurantId = request.RestaurantId,
            TableNo = request.TableNo,
            Items = request.Items.Select(item => new OrderItem
            {
                MenuItemId = item.MenuItemId,
                Name = item.Name,
                Price = item.Price,
                OrderedBy = item.OrderedBy,
                Status = item.Status,
                PaymentStatus = item.PaymentStatus
            }).ToList(),
            SessionStatus = OrderSessionStatus.Active,
            TotalAmount = request.Items.Sum(item => item.Price),
            RemainingAmount = request.Items.Where(item => item.PaymentStatus != PaymentStatus.Paid).Sum(item => item.Price)
        };

        await unitOfWork.Repository<Order>().InsertAsync(order, cancellationToken);
        await orderRealtimePublisher.PublishOrderCreatedAsync(order, cancellationToken);
        await auditLogService.RecordAsync("OrderCreated", nameof(Order), order.Id, $"Restaurant {order.RestaurantId}, Table {order.TableNo}.", currentUserService.UserId, cancellationToken);
        return order.Id;
    }
}