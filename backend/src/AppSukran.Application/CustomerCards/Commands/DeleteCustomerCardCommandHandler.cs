using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.CustomerCards.Commands;

public sealed class DeleteCustomerCardCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService) : IRequestHandler<DeleteCustomerCardCommand, Unit>
{
    public async Task<Unit> Handle(DeleteCustomerCardCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");
        var repository = unitOfWork.Repository<CustomerCard>();
        var card = await repository.GetByIdAsync(request.CustomerCardId, cancellationToken)
            ?? throw new InvalidOperationException("Card not found.");

        if (card.UserId != userId)
        {
            throw new InvalidOperationException("Card does not belong to the current user.");
        }

        await repository.DeleteAsync(card.Id, cancellationToken);
        return Unit.Value;
    }
}