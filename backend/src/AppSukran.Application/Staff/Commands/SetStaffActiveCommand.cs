using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed record SetStaffActiveCommand(string UserId, bool IsActive) : IRequest;
