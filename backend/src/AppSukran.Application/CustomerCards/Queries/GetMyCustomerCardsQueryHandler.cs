using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.CustomerCards.Queries;

public sealed class GetMyCustomerCardsQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<GetMyCustomerCardsQuery, IReadOnlyCollection<CustomerCardResponse>>
{
    public async Task<IReadOnlyCollection<CustomerCardResponse>> Handle(GetMyCustomerCardsQuery request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");
        var cards = await unitOfWork.Repository<CustomerCard>().FindAsync(card => card.UserId == userId, cancellationToken);
        return cards
            .OrderByDescending(card => card.IsDefault)
            .ThenByDescending(card => card.CreatedAt)
            .Select(card => new CustomerCardResponse(card.Id, card.CardholderName, card.Brand, card.Last4, card.ExpiryMonth, card.ExpiryYear, card.IsDefault, card.IsActive, card.CreatedAt))
            .ToList();
    }
}