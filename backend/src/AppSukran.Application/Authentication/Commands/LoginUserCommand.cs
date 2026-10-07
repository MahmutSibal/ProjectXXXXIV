using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record LoginUserCommand(
    string Email,
    string Password) : IRequest<TokenResponse>;