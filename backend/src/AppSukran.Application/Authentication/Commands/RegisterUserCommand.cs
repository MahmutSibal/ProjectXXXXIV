using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record RegisterUserCommand(
    string Name,
    string Email,
    string Password,
    UserRole Role,
    string? RestaurantId = null) : IRequest<TokenResponse>;