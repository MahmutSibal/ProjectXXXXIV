using AppSukran.Application.Support.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

/// <summary>Sitedeki iletişim formu. Giriş gerektirmez; IP başına hız sınırı vardır.</summary>
[ApiController]
[Route("api/contact")]
[AllowAnonymous]
public sealed class ContactController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("contact")]
    public async Task<IActionResult> Submit([FromBody] ContactFormRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new SubmitContactFormCommand(
            request.FullName ?? string.Empty, request.BusinessName ?? string.Empty, request.Email ?? string.Empty,
            request.Phone ?? string.Empty, request.City ?? string.Empty, request.BusinessType, request.Subject,
            request.TableCount, request.Message ?? string.Empty, request.KvkkAccepted, request.Website), cancellationToken);
        return NoContent();
    }
}

/// <param name="Website">Bot tuzağı (formda görünmez); insanlar boş bırakır.</param>
public sealed record ContactFormRequest(
    string? FullName, string? BusinessName, string? Email, string? Phone, string? City,
    string? BusinessType, string? Subject, int? TableCount, string? Message, bool KvkkAccepted, string? Website);
