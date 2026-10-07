using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Complaints.Queries;

public sealed record GetComplaintsQuery : IRequest<IReadOnlyCollection<ComplaintResponse>>;
