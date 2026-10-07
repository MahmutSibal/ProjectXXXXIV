using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed record UpdateOrderStatusCommand(string OrderId, OrderSessionStatus SessionStatus) : IRequest<Unit>;