using AppSukran.Application.Maintenance.Commands;
using AppSukran.Application.Maintenance.Queries;
using AppSukran.Application.PaymentSetup.Commands;
using AppSukran.Application.PaymentSetup.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// Platform ayarları. Şimdilik yalnızca havale/EFT banka bilgileri: işletmeler abonelik
/// ücretini bu hesaba yatırır. Platform işletmelerin cirosunu tahsil etmez.
/// </summary>
[ApiController]
[Route("api/platform-settings")]
public sealed class PlatformSettingsController(IMediator mediator) : ControllerBase
{
    /// <summary>Banka bilgileri fiyat/abonelik sayfalarında herkese gösterilir; giriş gerektirmez.</summary>
    [HttpGet("payment")]
    [AllowAnonymous]
    public async Task<ActionResult<PlatformPaymentSettingsResponse>> GetPayment(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetPlatformPaymentSettingsQuery(), cancellationToken));

    /// <summary>Yönetim ekranı: kayıtlı değerler Havale/EFT anahtarından bağımsız döner.</summary>
    [HttpGet("payment/admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<PlatformPaymentSettingsResponse>> GetPaymentAdmin(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetPlatformPaymentSettingsAdminQuery(), cancellationToken));

    [HttpPut("payment")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdatePayment(
        [FromBody] UpdatePlatformPaymentSettingsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdatePlatformPaymentSettingsCommand(
                request.BankName, request.AccountHolder, request.Iban, request.Branch, request.PaymentNote,
                request.BankTransferEnabled),
            cancellationToken);
        return NoContent();
    }

    /// <summary>iyzico logo bandı ve online kart ödemesi ana anahtarı; giriş gerektirmez.</summary>
    [HttpGet("payment-options")]
    [AllowAnonymous]
    public async Task<ActionResult<PaymentOptionsResponse>> GetPaymentOptions(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetPaymentOptionsQuery(), cancellationToken));

    /// <summary>Banka alanlarına dokunmaz; yalnızca iki ödeme altyapısı anahtarını günceller.</summary>
    [HttpPut("payment-options")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdatePaymentOptions(
        [FromBody] UpdatePaymentOptionsRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdatePaymentOptionsCommand(request.ShowIyzicoLogos, request.CardPaymentsEnabled),
            cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Bakım duyurusu ve sunucu kapatma durumu; giriş gerektirmez. Sunucu kapalıyken de
    /// ServerShutdownMiddleware bu uca izin verir.
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<ActionResult<PlatformStatusResponse>> GetStatus(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetPlatformStatusQuery(), cancellationToken));

    [HttpPut("status")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(
        [FromBody] UpdatePlatformStatusRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(
            new UpdateMaintenanceSettingsCommand(
                request.MaintenanceEnabled, request.Message, request.ServerDisabled),
            cancellationToken);
        return NoContent();
    }
}

/// <param name="ServerDisabled">Gönderilmezse (null) kayıtlı değer korunur; eski ön yüzlerle uyumluluk için.</param>
public sealed record UpdatePlatformStatusRequest(bool MaintenanceEnabled, string? Message, bool? ServerDisabled = null);

public sealed record UpdatePaymentOptionsRequest(bool ShowIyzicoLogos, bool CardPaymentsEnabled);

public sealed record UpdatePlatformPaymentSettingsRequest(
    string? BankName,
    string? AccountHolder,
    string? Iban,
    string? Branch,
    string? PaymentNote,
    bool? BankTransferEnabled = null);
