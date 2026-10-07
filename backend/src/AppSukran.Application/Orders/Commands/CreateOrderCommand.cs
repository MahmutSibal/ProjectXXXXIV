using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed record CreateOrderCommand(
    string RestaurantId,
    int TableNo,
    string TableSessionId,
    string QrToken,
    IReadOnlyCollection<CreateOrderItemDto> Items) : IRequest<string>;

public sealed record CreateOrderItemDto(string MenuItemId, string Name, long Price, string OrderedBy, OrderItemStatus Status, PaymentStatus PaymentStatus);