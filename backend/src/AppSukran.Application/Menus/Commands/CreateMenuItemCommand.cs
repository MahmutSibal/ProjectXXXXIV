using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed record CreateMenuItemCommand(
    string RestaurantId,
    string Category,
    string Name,
    string ImageUrl,
    IReadOnlyCollection<string> Ingredients,
    string? Recipe,
    int AveragePreparationTime,
    long Price,
    bool IsAvailable) : IRequest<string>;