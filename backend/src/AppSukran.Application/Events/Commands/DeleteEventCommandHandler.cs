using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Events.Commands;

public sealed class DeleteEventCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService) : IRequestHandler<DeleteEventCommand>
{
    public async Task Handle(DeleteEventCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var repository = unitOfWork.Repository<Event>();
        var ev = await repository.GetByIdAsync(request.EventId, cancellationToken);
        if (ev is null)
        {
            return;
        }

        if (ev.RestaurantId != restaurantId)
        {
            throw new UnauthorizedAccessException("You cannot manage this event.");
        }

        await repository.DeleteAsync(ev.Id, cancellationToken);
    }
}
