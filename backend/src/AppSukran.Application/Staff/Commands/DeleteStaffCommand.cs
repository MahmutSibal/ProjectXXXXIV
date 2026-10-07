using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed record DeleteStaffCommand(string UserId) : IRequest;
