using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed class CreateBillCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<CreateBillCommand, string>
{
    public async Task<string> Handle(CreateBillCommand request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

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

        // Hesap, masanın açık siparişlerinden çıkarılır. "Orders" tablosu hesapları da
        // tuttuğu için (TPH) yalnızca gerçek sipariş kayıtları alınır.
        var activeOrders = (await unitOfWork.Repository<Order>().FindAsync(
                order => order.RestaurantId == request.RestaurantId
                    && order.TableNo == request.TableNo
                    && order.SessionStatus == OrderSessionStatus.Active,
                cancellationToken))
            .Where(order => order.GetType() == typeof(Order))
            .ToList();

        var items = activeOrders
            .SelectMany(order => order.Items)
            .Select(item => new OrderItem
            {
                MenuItemId = item.MenuItemId,
                Name = item.Name,
                Price = item.Price,
                Extras = item.Extras.ToList(),
                OrderedBy = item.OrderedBy,
                Status = item.Status,
                PaymentStatus = item.PaymentStatus,
            })
            .ToList();

        if (items.Count == 0)
        {
            throw new InvalidOperationException("Bu masada hesabı çıkarılacak açık sipariş yok.");
        }

        var bill = new Bill
        {
            RestaurantId = request.RestaurantId,
            TableNo = request.TableNo,
            Items = items,
            SessionStatus = OrderSessionStatus.Active,
            TotalAmount = items.Sum(item => item.Price),
            RemainingAmount = items.Where(item => item.PaymentStatus != PaymentStatus.Paid).Sum(item => item.Price)
        };

        await unitOfWork.Repository<Bill>().InsertAsync(bill, cancellationToken);
        await auditLogService.RecordAsync("BillCreated", nameof(Bill), bill.Id, $"Restaurant {bill.RestaurantId}, Table {bill.TableNo}.", currentUserService.UserId, cancellationToken);
        return bill.Id;
    }
}
