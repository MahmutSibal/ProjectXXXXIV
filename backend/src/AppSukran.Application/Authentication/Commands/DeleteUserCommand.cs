using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record DeleteUserCommand(string UserId) : IRequest<Unit>;
