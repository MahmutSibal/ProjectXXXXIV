using AppSukran.Application.Common.Models;
using AppSukran.Application.Support.Commands;
using AppSukran.Application.Support.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/support-requests")]
[Authorize]
public sealed class SupportController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<IReadOnlyCollection<SupportRequestResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetSupportRequestsQuery(), cancellationToken));

    // İşletme sahibi ya da işletmesini Şükran'a taşımak isteyen (henüz restoranı olmayan
    // Customer rolündeki) bir kullanıcı destek talebi oluşturabilir.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupportRequestRequest request, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(new CreateSupportRequestCommand(request.BusinessName, request.Content, request.Phone, request.RestaurantId), cancellationToken);
        return Ok(new { id });
    }

    [HttpPut("{id}/called")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> SetCalled(string id, [FromBody] SetCalledRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new SetSupportCalledCommand(id, request.IsCalled), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteSupportRequestCommand(id), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateSupportRequestRequest(string BusinessName, string Content, string Phone, string? RestaurantId);
public sealed record SetCalledRequest(bool IsCalled);
