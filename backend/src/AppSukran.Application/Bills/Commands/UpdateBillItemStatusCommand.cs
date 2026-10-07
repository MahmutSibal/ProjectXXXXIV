using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed record UpdateBillItemStatusCommand(string BillId, string OrderItemId, OrderItemStatus Status) : IRequest<Unit>;