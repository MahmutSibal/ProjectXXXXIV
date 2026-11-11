using AppSukran.Application.Common.Models;
using AppSukran.Application.Profile.Commands;
using AppSukran.Application.Profile.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ProfileController(IMediator mediator) : ControllerBase
{
    /// <summary>Oturum açan kullanıcının profil bilgisi.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> GetMe(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetCurrentUserQuery(), cancellationToken));

    /// <summary>Ad, telefon, adres ve kampanya iznini günceller (gönderilmeyen alan korunur).</summary>
    [HttpPut("me")]
    public async Task<ActionResult<UserResponse>> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(
            new UpdateProfileCommand(request.Name, request.Phone, request.Address, request.MarketingConsent),
            cancellationToken));

    /// <summary>Şifre değiştirir; diğer cihazlardaki oturumlar kapanır.</summary>
    [HttpPut("me/password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ChangePasswordCommand(request.CurrentPassword, request.NewPassword), cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// "Hesabımı sil" (KVKK m.11). Müşteri/personel hesabı anonimleştirilir; işletme
    /// sahibinin talebi Süper Admin'e iletilir. Şifre onayı ister.
    /// </summary>
    [HttpPost("me/delete")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<DeleteMyAccountResult>> DeleteMe([FromBody] DeleteMyAccountRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new DeleteMyAccountCommand(request.Password), cancellationToken));
}

public sealed record DeleteMyAccountRequest(string Password);

public sealed record UpdateProfileRequest(string Name, string? Phone = null, string? Address = null, bool? MarketingConsent = null);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
