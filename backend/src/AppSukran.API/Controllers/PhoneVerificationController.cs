using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.PhoneVerification.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

/// <summary>
/// Kayıt öncesi doğrulama: WhatsApp (telefon) veya, WhatsApp'ı olmayanlar için, e-posta.
/// Kayıt olmadan çağrıldığı için anonimdir; kötüye kullanımı hız sınırı ile
/// engellenir. İki kanal aynı IP sınırını paylaşır.
/// </summary>
[ApiController]
[Route("api/phone-verification")]
[AllowAnonymous]
public sealed class PhoneVerificationController(
    IMediator mediator,
    IWhatsAppService whatsAppService,
    IEmailService emailService) : ControllerBase
{
    /// <summary>
    /// Doğrulama zorunlu mu, hangi kanallar açık? Kayıt ekranı buna göre doğrulama
    /// adımını ve seçenekleri gösterir. Mesaj göndermez — hız sınırına dahil edilmez.
    /// </summary>
    [HttpGet("status")]
    public ActionResult<PhoneVerificationStatusResponse> GetStatus()
        => Ok(new PhoneVerificationStatusResponse(
            whatsAppService.IsEnabled || emailService.IsEnabled,
            whatsAppService.IsEnabled,
            emailService.IsEnabled));

    [HttpPost("send")]
    [EnableRateLimiting("phone-verification-send")]
    public async Task<ActionResult<SendPhoneVerificationResult>> Send(
        [FromBody] SendPhoneVerificationRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(
            new SendPhoneVerificationCommand(request.Phone), cancellationToken));

    [HttpPost("verify")]
    [EnableRateLimiting("phone-verification-verify")]
    public async Task<ActionResult<VerifyPhoneCodeResult>> Verify(
        [FromBody] VerifyPhoneCodeRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new VerifyPhoneCodeCommand(request.Phone, request.Code), cancellationToken));

    [HttpPost("send-email")]
    [EnableRateLimiting("phone-verification-send")]
    public async Task<ActionResult<SendEmailVerificationResult>> SendEmail(
        [FromBody] SendEmailVerificationRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new SendEmailVerificationCommand(request.Email), cancellationToken));

    [HttpPost("verify-email")]
    [EnableRateLimiting("phone-verification-verify")]
    public async Task<ActionResult<VerifyPhoneCodeResult>> VerifyEmail(
        [FromBody] VerifyEmailCodeRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new VerifyEmailCodeCommand(request.Email, request.Code), cancellationToken));
}

/// <param name="Enabled">Doğrulama zorunlu mu (en az bir kanal açık).</param>
public sealed record PhoneVerificationStatusResponse(bool Enabled, bool WhatsApp, bool Email);
public sealed record SendPhoneVerificationRequest(string Phone);
public sealed record VerifyPhoneCodeRequest(string Phone, string Code);
public sealed record SendEmailVerificationRequest(string Email);
public sealed record VerifyEmailCodeRequest(string Email, string Code);
