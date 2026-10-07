using MediatR;

namespace AppSukran.Application.Categories.Commands;

public sealed record UpdateCategoryCommand(string CategoryId, string Name, string Description, string ImageUrl) : IRequest;
