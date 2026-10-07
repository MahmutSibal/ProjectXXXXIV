using AppSukran.Application.PaymentSetup.Commands;
using AppSukran.Application.PaymentSetup.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// İşletmenin masa ödemeleri için kendi iyzico hesabı. Platform işletmenin cirosuna
/// dokunmaz: kart ödemesi yalnızca işletme açıp kendi anahtarlarını girdiyse alınır.
/// Gizli anahtarlar yanıtlarda hiç dönmez.
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

    /// <param name="request">Boş/null anahtar ve adres alanları kayıtlı değeri korur.</param>
    [HttpPut("payment-settings")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<IActionResult> UpdateSettings(
        string restaurantId, [FromBody] UpdateRestaurantPaymentSettingsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdateRestaurantPaymentSettingsCommand(
                restaurantId, request.OnlinePaymentEnabled, request.ApiKey, request.SecretKey, request.BaseUrl),
            cancellationToken);
        return NoContent();
    }

    /// <summary>QR menüsü kart ödeme seçeneğini gösterip göstermeyeceğini buradan öğrenir.</summary>
    [HttpGet("online-payment")]
    [AllowAnonymous]
    public async Task<ActionResult<OnlinePaymentStatusResponse>> GetOnlinePayment(
        string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetOnlinePaymentStatusQuery(restaurantId), cancellationToken));
}

public sealed record UpdateRestaurantPaymentSettingsRequest(
    bool OnlinePaymentEnabled,
    string? ApiKey,
    string? SecretKey,
    string? BaseUrl);
