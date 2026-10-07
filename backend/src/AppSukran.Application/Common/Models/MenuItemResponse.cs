namespace AppSukran.Application.Common.Models;

public sealed record MenuItemResponse(
    string Id,
    string RestaurantId,
    string Category,
    string Name,
    string ImageUrl,
    IReadOnlyCollection<string> Ingredients,
    string? Recipe,
    int AveragePreparationTime,
    long Price,
    bool IsAvailable);