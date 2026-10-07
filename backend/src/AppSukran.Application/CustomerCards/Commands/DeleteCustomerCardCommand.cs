using MediatR;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed record DeleteCustomerCardCommand(string CustomerCardId) : IRequest<Unit>;