using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Orders.Queries;

public sealed class GetOrderByIdQueryHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<GetOrderByIdQuery, OrderResponse?>
{
    public async Task<OrderResponse?> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var order = await unitOfWork.Repository<Order>().GetByIdAsync(request.OrderId, cancellationToken);
        if (order is null)
        {
            return null;
        }

        restaurantAccessGuard.EnsureCanAccess(order.RestaurantId);
        return Map(order);
    }

    private static OrderResponse Map(Order order)
        => new(order.Id, order.RestaurantId, order.TableNo, order.SessionStatus, order.Items.Select(MapItem).ToList(), order.TotalAmount, order.RemainingAmount, order.CreatedAt);

    private static OrderItemResponse MapItem(OrderItem item)
        => new(item.OrderItemId, item.MenuItemId, item.Name, item.Price, item.OrderedBy, item.Status, item.PaymentStatus);
}