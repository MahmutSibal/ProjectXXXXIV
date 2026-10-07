using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;

namespace AppSukran.Application.Events;

internal static class EventMapping
{
    public static EventResponse ToResponse(this Event e) => new(
        e.Id,
        e.RestaurantId,
        e.Title,
        e.Description,
        e.ImageUrl,
        e.Date,
        e.Time,
        e.Location,
        e.Price,
        e.IsFree,
        e.Tags,
        e.IsPublished,
        e.CreatedAt);
}
