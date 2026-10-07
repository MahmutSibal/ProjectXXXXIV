using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Events.Queries;

public sealed class GetEventsQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetEventsQuery, IReadOnlyCollection<EventResponse>>
{
    public async Task<IReadOnlyCollection<EventResponse>> Handle(GetEventsQuery request, CancellationToken cancellationToken)
    {
        var restaurantId = string.IsNullOrWhiteSpace(request.RestaurantId)
            ? currentUserService.RestaurantId
            : request.RestaurantId;

        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var events = await unitOfWork.Repository<Event>()
            .FindAsync(e => e.RestaurantId == restaurantId, cancellationToken);

        return events
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => e.ToResponse())
            .ToList();
    }
}
