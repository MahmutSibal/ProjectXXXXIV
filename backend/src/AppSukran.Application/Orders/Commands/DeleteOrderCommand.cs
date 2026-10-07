using MediatR;

namespace AppSukran.Application.Orders.Commands;

public sealed record DeleteOrderCommand(string OrderId) : IRequest<Unit>;