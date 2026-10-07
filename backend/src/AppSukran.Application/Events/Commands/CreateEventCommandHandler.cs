using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Events.Commands;

public sealed class CreateEventCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    ISubscriptionGuard subscriptionGuard) : IRequestHandler<CreateEventCommand, string>
{
    public async Task<string> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        // Etkinlik panosu yalnızca Standart pakette var.
        await subscriptionGuard.EnsureFeatureAsync(restaurantId, SubscriptionFeature.Events, cancellationToken);

        var ev = new Event
        {
            RestaurantId = restaurantId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            ImageUrl = request.ImageUrl.Trim(),
            Date = request.Date.Trim(),
            Time = request.Time.Trim(),
            Location = request.Location.Trim(),
            Price = request.IsFree ? 0 : request.Price,
            IsFree = request.IsFree,
            Tags = request.Tags?.ToList() ?? [],
            IsPublished = true
        };

        await unitOfWork.Repository<Event>().InsertAsync(ev, cancellationToken);
        return ev.Id;
    }
}
