using AppSukran.Application.Common.Models;
using AppSukran.Application.Reports.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "RestaurantOwner")]
public sealed class ReportsController(IMediator mediator) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardSummaryResponse>> GetDashboard(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetDashboardSummaryQuery(), cancellationToken));

    [HttpGet("daily")]
    public async Task<ActionResult<DailyReportResponse>> GetDaily([FromQuery] string? date, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetDailyReportQuery(date), cancellationToken));
}
