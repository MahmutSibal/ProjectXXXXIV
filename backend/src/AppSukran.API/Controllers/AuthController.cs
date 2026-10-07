using AppSukran.Application.Authentication.Commands;
using AppSukran.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
// Kimlik doğrulama uçları herkese açıktır. reCAPTCHA kaldırıldığından kaba kuvvet
// ve toplu hesap açmaya karşı tek koruma IP başına hız sınırıdır.
[EnableRateLimiting("auth")]
public sealed class AuthController(IMediator mediator) : ControllerBase
{
    [HttpPost("qr-session")]
    public async Task<ActionResult<QrSessionResponse>> CreateQrSession([FromBody] CreateQrSessionRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new CreateQrSessionCommand(request.RestaurantId, request.TableNo, request.QrToken), cancellationToken);
        return Ok(result);
    }


    [HttpPost("register")]
    public async Task<ActionResult<TokenResponse>> Register([FromBody] RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new RegisterUserCommand(request.Name, request.Email, request.Password, request.Role, request.RestaurantId), cancellationToken);
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    /// <summary>
    /// Self-servis işletme kaydı: hesap, restoran ve ücretsiz deneme aboneliği
    /// tek adımda oluşturulur. Kullanıcı doğrudan yönetim paneline girer.
    /// </summary>
    [HttpPost("register-business")]
    public async Task<ActionResult<TokenResponse>> RegisterBusiness([FromBody] RegisterBusinessRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(
            new RegisterBusinessCommand(
                request.OwnerName, request.Email, request.Password, request.BusinessName,
                request.Phone, request.Address, request.Longitude, request.Latitude, request.PhoneVerificationTicket),
            cancellationToken);
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenResponse>> Login([FromBody] LoginUserRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new LoginUserCommand(request.Email, request.Password), cancellationToken);
        SetRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result);
    }

    [HttpPost("refresh")]
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

    [HttpPost("logout")]
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

public sealed record RegisterUserRequest(string Name, string Email, string Password, AppSukran.Domain.Enums.UserRole Role, string? RestaurantId = null);
public sealed record RegisterBusinessRequest(
    string OwnerName, string Email, string Password, string BusinessName,
    string Phone, string Address, double Longitude, double Latitude,
    string? PhoneVerificationTicket = null);
public sealed record LoginUserRequest(string Email, string Password);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record CreateQrSessionRequest(string RestaurantId, int TableNo, string QrToken);
