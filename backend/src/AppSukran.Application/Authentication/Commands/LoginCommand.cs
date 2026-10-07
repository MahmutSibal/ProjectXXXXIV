using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record LoginCommand(string UserId, string Email, UserRole Role) : IRequest<TokenResponse>;