using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using MediatR;
using System;

namespace AppSukran.Application.Authentication.Commands;

public sealed class LoginCommandHandler(ITokenService tokenService) : IRequestHandler<LoginCommand, TokenResponse>
{
    public Task<TokenResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var token = tokenService.CreateToken(request.UserId, request.Email, request.Role);
        return Task.FromResult(new TokenResponse(token, string.Empty, DateTime.UtcNow));
    }
}