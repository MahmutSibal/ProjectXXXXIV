using AppSukran.Application.Subscriptions;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// SuperAdmin paket yönetimi: ad, fiyat, kampanya indirimi, görünürlük, kart maddeleri ve
/// limitler. Değişiklikler ana sayfadaki paketlere, abonelik ekranına, ödeme tutarına ve
/// özellik kilitlerine hemen yansır.
/// </summary>
[ApiController]
[Route("api/admin/plans")]
[Authorize(Roles = "SuperAdmin")]
public sealed class PlanManagementController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PlanCatalogAdminResponse>> Get(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetPlanCatalogAdminQuery(), cancellationToken));

    [HttpPut("{plan}")]
    public async Task<ActionResult<PlanAdminResponse>> Update(SubscriptionPlan plan, [FromBody] UpdatePlanRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new UpdatePlanCommand(
            plan,
            request.DisplayName ?? string.Empty,
            request.Summary,
            request.MonthlyPrice,
            request.DiscountPercent,
            request.IsVisible,
            request.IsHighlighted,
            request.Bullets,
            request.HasOrdering,
            request.MaxQrOrdersPerPeriod,
            request.MaxKitchenPanels,
            request.MaxWaiterPanels,
            request.HasDetailedReports,
            request.HasEvents,
            request.MaxTables), cancellationToken));

    [HttpPost("{plan}/reset")]
    public async Task<ActionResult<PlanAdminResponse>> Reset(SubscriptionPlan plan, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ResetPlanCommand(plan), cancellationToken));

    [HttpPut("settings")]
    public async Task<ActionResult<PlanCatalogAdminResponse>> UpdateSettings([FromBody] UpdatePlanCatalogSettingsRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new UpdatePlanCatalogSettingsCommand(request.AnnualDiscountPercent, request.TrialDays), cancellationToken));
}

public sealed record UpdatePlanRequest(
    string? DisplayName,
    string? Summary,
    long MonthlyPrice,
    int DiscountPercent,
    bool IsVisible,
    bool IsHighlighted,
    IReadOnlyList<string>? Bullets,
    bool HasOrdering,
    int? MaxQrOrdersPerPeriod,
    int? MaxKitchenPanels,
    int? MaxWaiterPanels,
    bool HasDetailedReports,
    bool HasEvents,
    int? MaxTables);

public sealed record UpdatePlanCatalogSettingsRequest(int AnnualDiscountPercent, int TrialDays);
