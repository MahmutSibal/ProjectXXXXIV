using AppSukran.Application.Abstractions.Payments;
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
        var result = await mediator.Send(new PaySpecificItemsCommand(request.BillId, request.ItemIds, request.PaidByUserId, request.CustomerCardId, request.CardNumber, request.Cvc, request.Buyer?.ToBuyer()), cancellationToken);
        return Ok(result);
    }

    [HttpPost("split-equally")]
    public async Task<IActionResult> SplitEqually([FromBody] SplitEquallyRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new SplitEquallyCommand(request.BillId, request.PersonCount, request.PaidByUserId, request.CustomerCardId, request.CardNumber, request.Cvc, request.Buyer?.ToBuyer()), cancellationToken);
        return Ok(result);
    }

    [HttpPost("custom-amount")]
    public async Task<IActionResult> PayCustomAmount([FromBody] PayCustomAmountRequest request, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new PayCustomAmountCommand(request.BillId, request.Amount, request.PaidByUserId, request.CustomerCardId, request.CardNumber, request.Cvc, request.Buyer?.ToBuyer()), cancellationToken);
        return Ok(result);
    }
}

/// <summary>Kartla ödeyen müşterinin bilgileri (ödeme sağlayıcısı zorunlu tutar).</summary>
public sealed record PaymentBuyerRequest(string? FullName, string? Email, string? Address, string? Phone)
{
    public PaymentBuyer ToBuyer() => new(
        (FullName ?? string.Empty).Trim(),
        (Email ?? string.Empty).Trim(),
        (Address ?? string.Empty).Trim(),
        (Phone ?? string.Empty).Trim());
}

public sealed record PaySpecificItemsRequest(string BillId, IReadOnlyCollection<string> ItemIds, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null, PaymentBuyerRequest? Buyer = null);
public sealed record SplitEquallyRequest(string BillId, int PersonCount, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null, PaymentBuyerRequest? Buyer = null);
public sealed record PayCustomAmountRequest(string BillId, long Amount, string PaidByUserId, string? CustomerCardId = null, string? CardNumber = null, string? Cvc = null, PaymentBuyerRequest? Buyer = null);
