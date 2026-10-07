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

        var bill = new Bill
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

        await unitOfWork.Repository<Bill>().InsertAsync(bill, cancellationToken);
        await auditLogService.RecordAsync("BillCreated", nameof(Bill), bill.Id, $"Restaurant {bill.RestaurantId}, Table {bill.TableNo}.", currentUserService.UserId, cancellationToken);
        return bill.Id;
    }
}