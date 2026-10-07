using AppSukran.Application.AuditLogs.Queries;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,RestaurantOwner")]
public sealed class AuditLogsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditLogResponse>>> GetAll(
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null,
        [FromQuery] string? search = null,
        [FromQuery] UserRole? actorRole = null,
        [FromQuery] DateTime? createdFrom = null,
        [FromQuery] DateTime? createdTo = null,
        CancellationToken cancellationToken = default)
        => Ok(await mediator.Send(
            new GetAuditLogsQuery(page, pageSize, search, actorRole, createdFrom, createdTo), cancellationToken));
}
