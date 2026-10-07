using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed record UpdateMenuItemCommand(
    string MenuItemId,
    string Category,
    string Name,
    string ImageUrl,
    IReadOnlyCollection<string> Ingredients,
    string? Recipe,
    int AveragePreparationTime,
    long Price,
    bool IsAvailable) : IRequest<Unit>;