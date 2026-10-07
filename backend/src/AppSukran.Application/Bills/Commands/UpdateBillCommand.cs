using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed record UpdateBillCommand(string BillId, OrderSessionStatus SessionStatus, long RemainingAmount) : IRequest<Unit>;