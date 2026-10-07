using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.CustomerCards.Queries;

public sealed record GetMyCustomerCardsQuery() : IRequest<IReadOnlyCollection<CustomerCardResponse>>;