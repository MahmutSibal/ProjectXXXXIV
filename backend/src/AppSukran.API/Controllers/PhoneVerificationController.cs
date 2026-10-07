using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.PhoneVerification.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

/// <summary>
/// Kayıt öncesi WhatsApp ile telefon doğrulama.
/// Kayıt olmadan çağrıldığı için anonimdir; kötüye kullanımı hız sınırı ile
/// engellenir (her istek dışarıya mesaj gönderir).
/// </summary>
[ApiController]
[Route("api/phone-verification")]
[AllowAnonymous]
[EnableRateLimiting("phone-verification")]
public sealed class PhoneVerificationController(
    IMediator mediator,
    IWhatsAppService whatsAppService) : ControllerBase
{
    /// <summary>
    /// Telefon doğrulaması zorunlu mu? Kayıt ekranı buna göre doğrulama adımını
    /// gösterir; WhatsApp servisi devrede değilken kullanıcıyı boşuna bekletmez.
    /// </summary>
    [HttpGet("status")]
    public ActionResult<PhoneVerificationStatusResponse> GetStatus()
        => Ok(new PhoneVerificationStatusResponse(whatsAppService.IsEnabled));

    [HttpPost("send")]
    public async Task<ActionResult<SendPhoneVerificationResult>> Send(
        [FromBody] SendPhoneVerificationRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(
            new SendPhoneVerificationCommand(request.Phone), cancellationToken));

    [HttpPost("verify")]
    public async Task<ActionResult<VerifyPhoneCodeResult>> Verify(
        [FromBody] VerifyPhoneCodeRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new VerifyPhoneCodeCommand(request.Phone, request.Code), cancellationToken));
}

public sealed record PhoneVerificationStatusResponse(bool Enabled);
public sealed record SendPhoneVerificationRequest(string Phone);
public sealed record VerifyPhoneCodeRequest(string Phone, string Code);
