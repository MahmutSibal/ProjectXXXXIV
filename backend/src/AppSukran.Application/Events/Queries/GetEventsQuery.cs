using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Events.Queries;

// restaurantId boşsa geçerli kullanıcının restoranı kullanılır.
public sealed record GetEventsQuery(string? RestaurantId = null) : IRequest<IReadOnlyCollection<EventResponse>>;
