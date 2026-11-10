using AppSukran.Application.PaymentSetup;
using AppSukran.Application.PaymentSetup.Commands;
using AppSukran.Application.PaymentSetup.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// İşletmenin ödeme ayarları: masada kart ödemesi açık/kapalı ve ödemelerin
/// aktarılacağı banka hesabı (IBAN, hesap sahibi işletme adı ve ad soyad).
/// </summary>
[ApiController]
[Route("api/restaurants/{restaurantId}")]
public sealed class RestaurantPaymentSettingsController(IMediator mediator) : ControllerBase
{
    [HttpGet("payment-settings")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<ActionResult<RestaurantPaymentSettingsResponse>> GetSettings(
        string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetRestaurantPaymentSettingsQuery(restaurantId), cancellationToken));

    [HttpPut("payment-settings")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<IActionResult> UpdateSettings(
        string restaurantId, [FromBody] UpdateRestaurantPaymentSettingsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdateRestaurantPaymentSettingsCommand(
                restaurantId, request.OnlinePaymentEnabled, request.Iban,
                request.AccountHolderBusinessName, request.AccountHolderFullName),
            cancellationToken);
        return NoContent();
    }

    /// <summary>Valör (gün) ve platform komisyonu (%); yalnızca SuperAdmin.</summary>
    [HttpPut("payout-terms")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdatePayoutTerms(
        string restaurantId, [FromBody] UpdatePayoutTermsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdatePayoutTermsCommand(restaurantId, request.SettlementDays, request.CommissionPercent),
            cancellationToken);
        return NoContent();
    }

    /// <summary>Son N günün (varsayılan 15) sipariş adedi, brüt tutar, komisyon ve net tutarı.</summary>
    [HttpGet("earnings")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<ActionResult<EarningsReportResponse>> GetEarnings(
        string restaurantId, [FromQuery] int days = 15, CancellationToken cancellationToken = default)
        => Ok(await mediator.Send(new GetEarningsReportQuery(restaurantId, days), cancellationToken));

    /// <summary>QR menüsü kart ödeme seçeneğini gösterip göstermeyeceğini buradan öğrenir.</summary>
    [HttpGet("online-payment")]
    [AllowAnonymous]
    public async Task<ActionResult<OnlinePaymentStatusResponse>> GetOnlinePayment(
        string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetOnlinePaymentStatusQuery(restaurantId), cancellationToken));
}

public sealed record UpdateRestaurantPaymentSettingsRequest(
    bool OnlinePaymentEnabled,
    string? Iban,
    string? AccountHolderBusinessName,
    string? AccountHolderFullName);

public sealed record UpdatePayoutTermsRequest(int SettlementDays, decimal CommissionPercent);
