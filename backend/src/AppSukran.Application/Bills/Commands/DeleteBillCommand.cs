using MediatR;

namespace AppSukran.Application.Bills.Commands;

public sealed record DeleteBillCommand(string BillId) : IRequest<Unit>;