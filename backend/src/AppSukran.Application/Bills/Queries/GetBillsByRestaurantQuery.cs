using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Bills.Queries;

public sealed record GetBillsByRestaurantQuery(string RestaurantId) : IRequest<IReadOnlyCollection<BillResponse>>;