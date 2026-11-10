using AppSukran.Application.Common.Models;
using AppSukran.Application.Subscriptions.Commands;
using AppSukran.Application.Subscriptions.Queries;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class SubscriptionsController(IMediator mediator) : ControllerBase
{
    /// <summary>Satın alınabilir paketler. Fiyat sayfası için giriş gerektirmez.</summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyCollection<PlanOptionResponse>>> GetPlans(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetPlanOptionsQuery(), cancellationToken));

    /// <summary>
    /// Seçilen paket ve dönem için ödenecek tutar. Ödeme ekranında gösterilen
    /// rakam buradan gelir; istemcinin kendi hesabı kullanılmaz.
    /// </summary>
    [HttpGet("quote")]
    [AllowAnonymous]
    public async Task<ActionResult<PriceQuoteResponse>> GetQuote(
        [FromQuery] SubscriptionPlan plan,
        [FromQuery] int billingPeriodMonths = 1,
        CancellationToken cancellationToken = default)
        => Ok(await mediator.Send(new GetPriceQuoteQuery(plan, billingPeriodMonths), cancellationToken));

    [HttpGet("restaurant/{restaurantId}")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<ActionResult<SubscriptionResponse>> GetByRestaurant(string restaurantId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetSubscriptionQuery(restaurantId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<IReadOnlyCollection<SubscriptionResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetAllSubscriptionsQuery(), cancellationToken));

    [HttpPost("restaurant/{restaurantId}/plan")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<ActionResult<ChangePlanResult>> ChangePlan(string restaurantId, [FromBody] ChangePlanRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(
            new ChangePlanCommand(restaurantId, request.Plan, request.BillingPeriodMonths),
            cancellationToken));

    [HttpPost("restaurant/{restaurantId}/cancel")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<IActionResult> Cancel(string restaurantId, CancellationToken cancellationToken)
    {
        await mediator.Send(new CancelSubscriptionCommand(restaurantId), cancellationToken);
        return NoContent();
    }

    /// <summary>SuperAdmin'in elle süre uzatması (havale ile ödeme, destek amaçlı süre vb.).</summary>
    [HttpPost("restaurant/{restaurantId}/extend")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Extend(string restaurantId, [FromBody] ExtendSubscriptionRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new ExtendSubscriptionCommand(restaurantId, request.Plan, request.Months, request.RecordedAmount, request.Note),
            cancellationToken);
        return NoContent();
    }
}

public sealed record ChangePlanRequest(
    SubscriptionPlan Plan,
    int BillingPeriodMonths);

public sealed record ExtendSubscriptionRequest(
    SubscriptionPlan Plan,
    int Months,
    long? RecordedAmount = null,
    string? Note = null);
