using AppSukran.Application.Bills.Commands;
using AppSukran.Application.Bills.Queries;
using AppSukran.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("orders-write")]
public sealed class BillsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{billId}")]
    public async Task<ActionResult<BillResponse?>> GetById(string billId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetBillByIdQuery(billId), cancellationToken));

    [HttpGet("restaurant/{restaurantId}")]
    public async Task<ActionResult<IReadOnlyCollection<BillResponse>>> GetByRestaurant(string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetBillsByRestaurantQuery(restaurantId), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBillCommand request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(request, cancellationToken));

    [HttpPut("{billId}")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
    public async Task<IActionResult> Update(string billId, [FromBody] UpdateBillRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateBillCommand(billId, request.SessionStatus, request.RemainingAmount), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{billId}")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
    public async Task<IActionResult> Delete(string billId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteBillCommand(billId), cancellationToken);
        return NoContent();
    }

    [HttpPut("{billId}/items/{orderItemId}/status")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
    public async Task<IActionResult> UpdateItemStatus(string billId, string orderItemId, [FromBody] UpdateBillItemStatusRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateBillItemStatusCommand(billId, orderItemId, request.Status), cancellationToken);
        return NoContent();
    }
}

public sealed record UpdateBillRequest(AppSukran.Domain.Enums.OrderSessionStatus SessionStatus, long RemainingAmount);
public sealed record UpdateBillItemStatusRequest(AppSukran.Domain.Enums.OrderItemStatus Status);