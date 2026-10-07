using AppSukran.Application.Common.Models;
using AppSukran.Application.Staff.Commands;
using AppSukran.Application.Staff.Queries;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "RestaurantOwner")]
public sealed class StaffController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<UserResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetStaffQuery(), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest request, CancellationToken cancellationToken)
    {
        var userId = await mediator.Send(new CreateStaffCommand(request.Name, request.Email, request.Password, request.Role), cancellationToken);
        return Ok(new { userId });
    }

    [HttpPut("{userId}/status")]
    public async Task<IActionResult> SetStatus(string userId, [FromBody] SetStaffStatusRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new SetStaffActiveCommand(userId, request.IsActive), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> Delete(string userId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteStaffCommand(userId), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateStaffRequest(string Name, string Email, string Password, UserRole Role);
public sealed record SetStaffStatusRequest(bool IsActive);
