using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed class UpdateBillItemStatusCommandHandler(IUnitOfWork unitOfWork, IOrderRealtimePublisher orderRealtimePublisher, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<UpdateBillItemStatusCommand, Unit>
{
    public async Task<Unit> Handle(UpdateBillItemStatusCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Bill>();
        var bill = await repository.GetByIdAsync(request.BillId, cancellationToken)
            ?? throw new InvalidOperationException("Bill not found.");

        restaurantAccessGuard.EnsureCanAccess(bill.RestaurantId);

        var item = bill.Items.FirstOrDefault(orderItem => orderItem.OrderItemId == request.OrderItemId)
            ?? throw new InvalidOperationException("Bill item not found.");

        if (item.PaymentStatus != PaymentStatus.Unpaid)
        {
            throw new InvalidOperationException("Paid or processing items cannot be modified.");
        }

        item.Status = request.Status;
        await repository.ReplaceAsync(bill, cancellationToken);
        await orderRealtimePublisher.PublishOrderUpdatedAsync(bill, cancellationToken);
        await auditLogService.RecordAsync("BillItemStatusUpdated", nameof(OrderItem), item.OrderItemId, $"Status changed to {request.Status}.", currentUserService.UserId, cancellationToken);
        return Unit.Value;
    }
}