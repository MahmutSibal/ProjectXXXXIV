using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reports.Queries;

public sealed record GetDashboardSummaryQuery : IRequest<DashboardSummaryResponse>;
