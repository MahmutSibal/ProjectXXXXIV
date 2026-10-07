using AppSukran.Application.Common.Models;
using AppSukran.Application.Complaints.Commands;
using AppSukran.Application.Complaints.Queries;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ComplaintsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<IReadOnlyCollection<ComplaintResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetComplaintsQuery(), cancellationToken));

    // Müşteri/işletme şikayet oluşturabilir.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateComplaintRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new CreateComplaintCommand(request.RestaurantName, request.UserName, request.Content, request.RestaurantId), cancellationToken);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateComplaintRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateComplaintCommand(id, request.Status, request.Response), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateComplaintRequest(string RestaurantName, string UserName, string Content, string? RestaurantId);
public sealed record UpdateComplaintRequest(ComplaintStatus Status, string Response);
