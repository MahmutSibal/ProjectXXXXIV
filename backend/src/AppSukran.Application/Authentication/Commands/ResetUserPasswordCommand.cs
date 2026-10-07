using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed record ResetUserPasswordCommand(string UserId, string NewPassword) : IRequest<Unit>;