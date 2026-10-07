using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record RefreshTokenCommand(string RefreshToken) : IRequest<TokenResponse>;