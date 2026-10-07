using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed record UpdateOrderItemStatusCommand(string OrderId, string OrderItemId, OrderItemStatus Status) : IRequest<Unit>;