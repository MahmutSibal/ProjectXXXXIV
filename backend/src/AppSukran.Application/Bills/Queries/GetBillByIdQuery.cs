using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Bills.Queries;

public sealed record GetBillByIdQuery(string BillId) : IRequest<BillResponse?>;