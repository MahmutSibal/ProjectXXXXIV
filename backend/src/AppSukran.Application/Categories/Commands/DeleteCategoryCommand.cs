using MediatR;

namespace AppSukran.Application.Categories.Commands;

public sealed record DeleteCategoryCommand(string CategoryId) : IRequest;
