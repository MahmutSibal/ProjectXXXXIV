using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed record CreateStaffCommand(string Name, string Email, string Password, UserRole Role)
    : IRequest<string>;
