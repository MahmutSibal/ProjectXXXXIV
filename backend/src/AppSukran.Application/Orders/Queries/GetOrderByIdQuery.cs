using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Orders.Queries;

public sealed record GetOrderByIdQuery(string OrderId) : IRequest<OrderResponse?>;