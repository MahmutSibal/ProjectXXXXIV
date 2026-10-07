using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Profile.Queries;

public sealed record GetCurrentUserQuery() : IRequest<UserResponse>;
