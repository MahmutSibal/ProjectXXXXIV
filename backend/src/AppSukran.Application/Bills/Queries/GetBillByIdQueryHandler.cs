using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Bills.Queries;

public sealed class GetBillByIdQueryHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard, ICurrentUserService currentUserService) : IRequestHandler<GetBillByIdQuery, BillResponse?>
{
    public async Task<BillResponse?> Handle(GetBillByIdQuery request, CancellationToken cancellationToken)
    {
        var bill = await unitOfWork.Repository<Bill>().GetByIdAsync(request.BillId, cancellationToken);
        if (bill is null)
        {
            return null;
        }

        // Personel: kendi restoranı. QR müşterisi: yalnızca kendi masası.
        PaymentAuthorization.EnsureCanAccessBill(bill.RestaurantId, bill.TableNo, restaurantAccessGuard, currentUserService);
        return Map(bill);
    }

    private static BillResponse Map(Bill bill)
        => new(bill.Id, bill.RestaurantId, bill.TableNo, bill.SessionStatus, bill.Items.Select(MapItem).ToList(), bill.TotalAmount, bill.RemainingAmount, bill.CreatedAt);

    private static OrderItemResponse MapItem(OrderItem item)
        => new(item.OrderItemId, item.MenuItemId, item.Name, item.Price, item.OrderedBy, item.Status, item.PaymentStatus, item.Extras);
}