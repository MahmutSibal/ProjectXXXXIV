using AppSukran.Application.Payments.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("payments-write")]
public sealed class PaymentsController(IMediator mediator) : ControllerBase
{
    [HttpPost("specific-items")]
    public async Task<IActionResult> PaySpecificItems([FromBody] PaySpecificItemsRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new PaySpecificItemsCommand(request.BillId, request.ItemIds, request.PaidByUserId, request.CustomerCardId, request.CardNumber, request.Cvc), cancellationToken);
        return Ok(result);
    }

    [HttpPost("split-equally")]
    public async Task<IActionResult> SplitEqually([FromBody] SplitEquallyRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new SplitEquallyCommand(request.BillId, request.PersonCount, request.PaidByUserId, request.CustomerCardId, request.CardNumber, request.Cvc), cancellationToken);
        return Ok(result);
    }

    [HttpPost("custom-amount")]
    public async Task<IActionResult> PayCustomAmount([FromBody] PayCustomAmountRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new PayCustomAmountCommand(request.BillId, request.Amount, request.PaidByUserId, request.CustomerCardId, request.CardNumber, request.Cvc), cancellationToken);
        return Ok(result);
    }
}

public sealed record PaySpecificItemsRequest(string BillId, IReadOnlyCollection<string> ItemIds, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null);
public sealed record SplitEquallyRequest(string BillId, int PersonCount, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null);
public sealed record PayCustomAmountRequest(string BillId, long Amount, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null);