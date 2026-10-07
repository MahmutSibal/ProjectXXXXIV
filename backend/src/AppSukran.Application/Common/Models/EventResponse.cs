namespace AppSukran.Application.Common.Models;

public sealed record EventResponse(
    string Id,
    string RestaurantId,
    string Title,
    string Description,
    string ImageUrl,
    string Date,
    string Time,
    string Location,
    long Price,
    bool IsFree,
    IReadOnlyCollection<string> Tags,
    bool IsPublished,
    DateTime CreatedAt);
