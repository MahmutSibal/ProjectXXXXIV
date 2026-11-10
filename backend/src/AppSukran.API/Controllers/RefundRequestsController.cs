using AppSukran.Application.Refunds;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

/// <summary>QR menüden açılan müşteri iade talepleri.</summary>
[ApiController]
[Route("api/refund-requests")]
[Authorize]
public sealed class RefundRequestsController(IMediator mediator) : ControllerBase
{
    /// <summary>Masadaki müşteri (QR oturumu) talep açar; restoran ve masa token'dan alınır.</summary>
    [HttpPost]
    [Authorize(Roles = "Customer")]
    [EnableRateLimiting("orders-write")]
    public async Task<IActionResult> Create([FromBody] CreateRefundRequestRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(
            new CreateRefundRequestCommand(request.Content, request.Method, request.Iban, request.AccountHolderName),
            cancellationToken);
        return Ok(new { id });
    }

    [HttpGet("restaurant/{restaurantId}")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Kitchen,Waiter")]
    public async Task<ActionResult<IReadOnlyCollection<RefundRequestResponse>>> GetByRestaurant(
        string restaurantId, [FromQuery] RefundRequestStatus? status, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetRefundRequestsQuery(restaurantId, status), cancellationToken));

    [HttpPut("{id}/status")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Kitchen,Waiter")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateRefundRequestStatusRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateRefundRequestStatusCommand(id, request.Status, request.ResolutionNote), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateRefundRequestRequest(string Content, RefundMethod Method, string? Iban = null, string? AccountHolderName = null);
public sealed record UpdateRefundRequestStatusRequest(RefundRequestStatus Status, string? ResolutionNote = null);
