using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Events.Commands;

public sealed class UpdateEventCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService) : IRequestHandler<UpdateEventCommand>
{
    public async Task Handle(UpdateEventCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var repository = unitOfWork.Repository<Event>();
        var ev = await repository.GetByIdAsync(request.EventId, cancellationToken)
            ?? throw new InvalidOperationException("Event not found.");

        if (ev.RestaurantId != restaurantId)
        {
            throw new UnauthorizedAccessException("You cannot manage this event.");
        }

        ev.Title = request.Title.Trim();
        ev.Description = request.Description.Trim();
        ev.ImageUrl = request.ImageUrl.Trim();
        ev.Date = request.Date.Trim();
        ev.Time = request.Time.Trim();
        ev.Location = request.Location.Trim();
        ev.Price = request.IsFree ? 0 : request.Price;
        ev.IsFree = request.IsFree;
        ev.Tags = request.Tags?.ToList() ?? [];
        ev.IsPublished = request.IsPublished;

        await repository.ReplaceAsync(ev, cancellationToken);
    }
}
