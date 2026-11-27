using AppSukran.Application.Authentication.Commands;
using AppSukran.Application.Common.Models;
using AppSukran.API.Security;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
// Kimlik doğrulama uçları herkese açıktır. Kaba kuvvet ve toplu hesap açmaya karşı IP başına
// hız sınırı, giriş ve kayıtta ayrıca robot doğrulaması (Turnstile, ayarlıysa) vardır.
[EnableRateLimiting("auth")]
public sealed class AuthController(IMediator mediator, TurnstileVerifier turnstile) : ControllerBase
{
    /// <summary>
    /// Robot doğrulaması açık mı, açıksa site anahtarı. Frontend giriş/kayıt ekranında
    /// doğrulama kutusunu buna göre gösterir. Site anahtarı gizli değildir.
    /// </summary>
    [HttpGet("human-verification")]
    [EnableRateLimiting("token-refresh")]
    public ActionResult<HumanVerificationResponse> HumanVerification()
        => Ok(new HumanVerificationResponse(turnstile.IsEnabled, turnstile.SiteKey));

    // Restoranın Wi-Fi'ındaki bütün misafirler aynı IP'den QR okutur; giriş/kayıt
    // sınırını paylaşsaydı 11. misafir menüyü açamazdı.
    [HttpPost("qr-session")]
    [EnableRateLimiting("qr-session")]
    public async Task<ActionResult<QrSessionResponse>> CreateQrSession([FromBody] CreateQrSessionRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new CreateQrSessionCommand(request.RestaurantId, request.TableNo, request.QrToken), cancellationToken);
        return Ok(result);
    }


    [HttpPost("register")]
    [RequireHumanVerification]
    public async Task<ActionResult<TokenResponse>> Register([FromBody] RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new RegisterUserCommand(request.Name, request.Email, request.Password, request.Phone, request.Address, request.MarketingConsent),
            cancellationToken);
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    /// <summary>
    /// Self-servis işletme kaydı: hesap, restoran ve ücretsiz deneme aboneliği
    /// tek adımda oluşturulur. Kullanıcı doğrudan yönetim paneline girer.
    /// </summary>
    [HttpPost("register-business")]
    [RequireHumanVerification]
    public async Task<ActionResult<TokenResponse>> RegisterBusiness([FromBody] RegisterBusinessRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new RegisterBusinessCommand(
                request.OwnerName, request.Email, request.Password, request.BusinessName,
                request.Phone, request.Address, request.Longitude, request.Latitude, request.PhoneVerificationTicket,
                request.MarketingConsent),
            cancellationToken);
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    // Kaba kuvvete karşı asıl koruma hesap + IP başına deneme sayacıdır (ILoginAttemptGuard);
    // IP sınırı aynı ağdaki personelin vardiya başında birlikte girebileceği kadar geniştir.
    [HttpPost("login")]
    [RequireHumanVerification]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginUserRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new LoginUserCommand(request.Email, request.Password), cancellationToken);
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    // Açık her panel oturumu süresi dolunca token yeniler; giriş sınırını tüketmemeli.
    [HttpPost("refresh")]
    [EnableRateLimiting("token-refresh")]
    public async Task<ActionResult<TokenResponse>> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var refreshToken = request.RefreshToken;
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            // Try to read HttpOnly cookie set by server
            if (Request.Cookies.TryGetValue("appsukran_refresh", out var cookieToken))
            {
                refreshToken = cookieToken;
            }
        }

        var result = await mediator.Send(new RefreshTokenCommand(refreshToken ?? string.Empty), cancellationToken);
        // rotate cookie with new refresh token
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    /// <summary>"Şifremi unuttum": hesap varsa e-postayla sıfırlama bağlantısı gönderir (yanıt hep aynıdır).</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new RequestPasswordResetCommand(request.Email ?? string.Empty), cancellationToken);
        return NoContent();
    }

    /// <summary>E-postadaki bağlantıyla yeni şifre belirler.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ResetPasswordCommand(request.Token ?? string.Empty, request.NewPassword ?? string.Empty), cancellationToken);
        return NoContent();
    }

    [HttpPost("logout")]
    [EnableRateLimiting("token-refresh")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        var refreshToken = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            Request.Cookies.TryGetValue("appsukran_refresh", out refreshToken);
        }

        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            await mediator.Send(new RevokeRefreshTokenCommand(refreshToken), cancellationToken);
        }

        // Remove cookie
        Response.Cookies.Append("appsukran_refresh", string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = DateTime.UtcNow.AddDays(-1)
        });

        return NoContent();
    }

    private void SetRefreshCookie(string refreshToken, DateTime expiresAt)
    {
        Response.Cookies.Append("appsukran_refresh", refreshToken ?? string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
            Expires = DateTime.SpecifyKind(expiresAt, DateTimeKind.Utc)
        });
    }
}

// Rol ve restoran alanları kaldırıldı: herkese açık kayıt yalnızca müşteri hesabı açar.
public sealed record RegisterUserRequest(string Name, string Email, string Password, string? Phone = null, string? Address = null, bool MarketingConsent = false);
public sealed record RegisterBusinessRequest(
    string OwnerName, string Email, string Password, string BusinessName,
    string Phone, string Address, double Longitude, double Latitude,
    string? PhoneVerificationTicket = null,
    bool MarketingConsent = false);
public sealed record LoginUserRequest(string Email, string Password);
public sealed record ForgotPasswordRequest(string? Email);
public sealed record ResetPasswordRequest(string? Token, string? NewPassword);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record CreateQrSessionRequest(string RestaurantId, int TableNo, string QrToken);

public sealed record HumanVerificationResponse(bool Enabled, string? SiteKey);
