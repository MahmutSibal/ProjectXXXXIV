using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record RevokeRefreshTokenCommand(string RefreshToken) : IRequest;
