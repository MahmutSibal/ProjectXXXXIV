using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed record CreateBillCommand(
    string RestaurantId,
    int TableNo,
    string TableSessionId,
    string QrToken,
    IReadOnlyCollection<CreateBillItemDto> Items) : IRequest<string>;

public sealed record CreateBillItemDto(string MenuItemId, string Name, long Price, string OrderedBy, OrderItemStatus Status, PaymentStatus PaymentStatus);