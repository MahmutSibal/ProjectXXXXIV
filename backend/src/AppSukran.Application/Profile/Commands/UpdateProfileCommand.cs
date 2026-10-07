using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Profile.Commands;

public sealed record UpdateProfileCommand(string Name) : IRequest<UserResponse>;
