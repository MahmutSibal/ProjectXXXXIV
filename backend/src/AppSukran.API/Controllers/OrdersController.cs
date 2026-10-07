using AppSukran.Application.Orders.Commands;
using AppSukran.Application.Orders.Queries;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("orders-write")]
public sealed class OrdersController(IMediator mediator) : ControllerBase
{
    [HttpGet("{orderId}")]
    public async Task<ActionResult<OrderResponse?>> GetById(string orderId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetOrderByIdQuery(orderId), cancellationToken));

    [HttpGet("restaurant/{restaurantId}")]
    public async Task<ActionResult<PagedResult<OrderResponse>>> GetByRestaurant(
        string restaurantId,
        [FromQuery] OrderSessionStatus? sessionStatus = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null,
        [FromQuery] int? tableNo = null,
        [FromQuery] DateTime? createdFrom = null,
        [FromQuery] DateTime? createdTo = null,
        CancellationToken cancellationToken = default)
        => Ok(await mediator.Send(
            new GetOrdersByRestaurantQuery(restaurantId, sessionStatus, page, pageSize, tableNo, createdFrom, createdTo),
            cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderCommand request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(request, cancellationToken));

    [HttpPut("{orderId}/status")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
    public async Task<IActionResult> UpdateStatus(string orderId, [FromBody] UpdateOrderStatusRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateOrderStatusCommand(orderId, request.SessionStatus), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{orderId}")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
    public async Task<IActionResult> Delete(string orderId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteOrderCommand(orderId), cancellationToken);
        return NoContent();
    }

    [HttpPut("{orderId}/items/{orderItemId}/status")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
    public async Task<IActionResult> UpdateItemStatus(string orderId, string orderItemId, [FromBody] UpdateOrderItemStatusRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateOrderItemStatusCommand(orderId, orderItemId, request.Status), cancellationToken);
        return NoContent();
    }
}

public sealed record UpdateOrderStatusRequest(AppSukran.Domain.Enums.OrderSessionStatus SessionStatus);
public sealed record UpdateOrderItemStatusRequest(AppSukran.Domain.Enums.OrderItemStatus Status);