using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed record DeleteMenuItemCommand(string MenuItemId) : IRequest<Unit>;