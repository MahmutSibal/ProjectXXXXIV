using AppSukran.Application.Authentication.Commands;
using AppSukran.Application.Authentication.Queries;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "SuperAdminOnly")]
public sealed class UsersController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserResponse>>> GetAll(
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null,
        [FromQuery] string? search = null,
        [FromQuery] UserRole? role = null,
        [FromQuery] string? restaurantId = null,
        [FromQuery] bool onlyWithoutRestaurant = false,
        CancellationToken cancellationToken = default)
    {
        var users = await mediator.Send(
            new GetUsersQuery(page, pageSize, search, role, restaurantId, onlyWithoutRestaurant),
            cancellationToken);
        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var userId = await mediator.Send(
            new CreateUserCommand(request.Name, request.Email, request.Password, request.Role, request.RestaurantId),
            cancellationToken);
        return Ok(new { userId });
    }

    [HttpPut("{userId}/role")]
    public async Task<IActionResult> UpdateRole(string userId, [FromBody] UpdateUserRoleRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateUserRoleCommand(userId, request.Role, request.RestaurantId), cancellationToken);
        return NoContent();
    }

    [HttpPut("{userId}/reset-password")]
    public async Task<IActionResult> ResetPassword(string userId, [FromBody] ResetUserPasswordRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ResetUserPasswordCommand(userId, request.NewPassword), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> Delete(string userId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteUserCommand(userId), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateUserRequest(string Name, string Email, string Password, AppSukran.Domain.Enums.UserRole Role, string? RestaurantId = null);
public sealed record UpdateUserRoleRequest(AppSukran.Domain.Enums.UserRole Role, string? RestaurantId = null);
public sealed record ResetUserPasswordRequest(string NewPassword);
