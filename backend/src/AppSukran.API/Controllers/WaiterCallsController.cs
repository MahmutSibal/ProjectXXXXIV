using AppSukran.Application.WaiterCalls;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AppSukran.API.Controllers;

/// <summary>QR menüden garson çağırma. Restoran ve masa müşterinin QR oturum token'ından alınır.</summary>
[ApiController]
[Route("api/waiter-calls")]
[Authorize(Roles = "Customer")]
public sealed class WaiterCallsController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("waiter-call")]
    public async Task<IActionResult> Call([FromBody] CallWaiterRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new CallWaiterCommand(request.Reason, request.Note), cancellationToken);
        return NoContent();
    }
}

public sealed record CallWaiterRequest(WaiterCallReason Reason = WaiterCallReason.Service, string? Note = null);
