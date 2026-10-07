using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed record SetMenuItemAvailabilityCommand(string MenuItemId, bool IsAvailable) : IRequest;
