using System.Linq.Expressions;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Orders.Queries;

public sealed class GetOrdersByRestaurantQueryHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<GetOrdersByRestaurantQuery, PagedResult<OrderResponse>>
{
    public async Task<PagedResult<OrderResponse>> Handle(GetOrdersByRestaurantQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var page = new PageRequest(request.Page, request.PageSize);
        var restaurantId = request.RestaurantId;
        var sessionStatus = request.SessionStatus;

        Expression<Func<Order, bool>> filter = order => order.RestaurantId == restaurantId;

        if (sessionStatus is { } status)
        {
            filter = filter.And(order => order.SessionStatus == status);
        }

        if (request.TableNo is { } tableNo)
        {
            filter = filter.And(order => order.TableNo == tableNo);
        }

        if (request.CreatedFrom is { } from)
        {
            filter = filter.And(order => order.CreatedAt >= from);
        }

        if (request.CreatedTo is { } to)
        {
            filter = filter.And(order => order.CreatedAt < to);
        }

        var repository = unitOfWork.Repository<Order>();
        var totalCount = await repository.CountAsync(filter, cancellationToken);

        // En yeni sipariş en üstte: hem canlı ekran hem geçmiş için doğru sıra.
        var orders = await repository.QueryAsync(
            filter, order => order.CreatedAt, descending: true, page.Skip, page.PageSize, cancellationToken);

        return new PagedResult<OrderResponse>(orders.Select(Map).ToList(), page.Page, page.PageSize, totalCount);
    }

    private static OrderResponse Map(Order order)
        => new(order.Id, order.RestaurantId, order.TableNo, order.SessionStatus, order.Items.Select(MapItem).ToList(), order.TotalAmount, order.RemainingAmount, order.CreatedAt);

    private static OrderItemResponse MapItem(OrderItem item)
        => new(item.OrderItemId, item.MenuItemId, item.Name, item.Price, item.OrderedBy, item.Status, item.PaymentStatus);
}
