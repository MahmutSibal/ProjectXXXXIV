using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record UpdateUserRoleCommand(string UserId, UserRole Role, string? RestaurantId = null) : IRequest<Unit>;