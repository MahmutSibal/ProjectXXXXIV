using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Bills.Queries;

public sealed class GetBillsByRestaurantQueryHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<GetBillsByRestaurantQuery, IReadOnlyCollection<BillResponse>>
{
    public async Task<IReadOnlyCollection<BillResponse>> Handle(GetBillsByRestaurantQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);
        var bills = await unitOfWork.Repository<Bill>()
            .FindAsync(bill => bill.RestaurantId == request.RestaurantId, cancellationToken);
        return bills.Select(Map).ToList();
    }

    private static BillResponse Map(Bill bill)
        => new(bill.Id, bill.RestaurantId, bill.TableNo, bill.SessionStatus, bill.Items.Select(MapItem).ToList(), bill.TotalAmount, bill.RemainingAmount, bill.CreatedAt);

    private static OrderItemResponse MapItem(OrderItem item)
        => new(item.OrderItemId, item.MenuItemId, item.Name, item.Price, item.OrderedBy, item.Status, item.PaymentStatus);
}