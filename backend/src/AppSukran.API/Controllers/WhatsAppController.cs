using AppSukran.Application.Abstractions.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// SuperAdmin için WhatsApp oturum yönetimi. QR kodu buradan okutulur.
/// Yalnızca SuperAdmin erişebilir: bu oturum, platformun WhatsApp hesabı
/// adına mesaj gönderme yetkisidir.
/// </summary>
[ApiController]
[Route("api/whatsapp")]
[Authorize(Policy = "SuperAdminOnly")]
public sealed class WhatsAppController(IWhatsAppService whatsAppService) : ControllerBase
{
    [HttpGet("status")]
    public async Task<ActionResult<WhatsAppStatusResponse>> GetStatus(CancellationToken cancellationToken)
    {
        if (!whatsAppService.IsEnabled)
        {
            return Ok(new WhatsAppStatusResponse(false, "disabled", null, null, null, null));
        }

        var status = await whatsAppService.GetStatusAsync(cancellationToken);
        return Ok(Map(status));
    }

    [HttpPost("session/start")]
    public async Task<ActionResult<WhatsAppStatusResponse>> Start(CancellationToken cancellationToken)
        => Ok(Map(await whatsAppService.StartSessionAsync(cancellationToken)));

    [HttpPost("session/logout")]
    public async Task<ActionResult<WhatsAppStatusResponse>> Logout(CancellationToken cancellationToken)
        => Ok(Map(await whatsAppService.LogoutAsync(cancellationToken)));

    private static WhatsAppStatusResponse Map(WhatsAppStatus status)
        => new(true, status.Status, status.QrDataUrl, status.PhoneNumber, status.LastError, status.ConnectedAt);
}

public sealed record WhatsAppStatusResponse(
    bool Enabled,
    string Status,
    string? QrDataUrl,
    string? PhoneNumber,
    string? LastError,
    DateTime? ConnectedAt);
