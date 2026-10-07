using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Support.Queries;

public sealed record GetSupportRequestsQuery : IRequest<IReadOnlyCollection<SupportRequestResponse>>;
