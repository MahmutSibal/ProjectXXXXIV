using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed class VerifyCustomerCardCommandHandler(
    IUnitOfWork unitOfWork,
    ICardNumberProtectionService cardProtectionService,
    ICurrentUserService currentUserService)
    : IRequestHandler<VerifyCustomerCardCommand, CustomerCardVerificationResponse>
{
    public async Task<CustomerCardVerificationResponse> Handle(VerifyCustomerCardCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");
        var card = await unitOfWork.Repository<CustomerCard>().GetByIdAsync(request.CustomerCardId, cancellationToken)
            ?? throw new InvalidOperationException("Card not found.");

        if (card.UserId != userId)
        {
            throw new InvalidOperationException("Card does not belong to the current user.");
        }

        if (!card.IsActive)
        {
            return new CustomerCardVerificationResponse(false, card.Brand, card.Last4, "Card is inactive.");
        }

        var matches = cardProtectionService.VerifyCardNumber(request.CardNumber, card.CardHash);
        return matches
            ? new CustomerCardVerificationResponse(true, card.Brand, card.Last4, "Card verified.")
            : new CustomerCardVerificationResponse(false, card.Brand, card.Last4, "Card number does not match.");
    }
}