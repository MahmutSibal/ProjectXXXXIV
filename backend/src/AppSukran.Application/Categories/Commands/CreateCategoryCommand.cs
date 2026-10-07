using MediatR;

namespace AppSukran.Application.Categories.Commands;

public sealed record CreateCategoryCommand(string RestaurantId, string Name, string Description, string ImageUrl) : IRequest<string>;
