using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Reports.Queries;

// Date: "yyyy-MM-dd" (UTC). Boş ise bugün kullanılır.
public sealed record GetDailyReportQuery(string? Date) : IRequest<DailyReportResponse>;
