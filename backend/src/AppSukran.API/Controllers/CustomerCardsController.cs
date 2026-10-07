using AppSukran.Application.CustomerCards.Commands;
using AppSukran.Application.CustomerCards.Queries;
using AppSukran.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Customer")]
public sealed class CustomerCardsController(IMediator mediator) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyCollection<CustomerCardResponse>>> GetMyCards(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetMyCustomerCardsQuery(), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CustomerCardResponse>> Create([FromBody] CreateCustomerCardRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new CreateCustomerCardCommand(request.CardholderName, request.CardNumber, request.ExpiryMonth, request.ExpiryYear, request.Cvv, request.IsDefault), cancellationToken));

    [HttpPost("verify")]
    public async Task<ActionResult<CustomerCardVerificationResponse>> Verify([FromBody] VerifyCustomerCardRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new VerifyCustomerCardCommand(request.CustomerCardId, request.CardNumber), cancellationToken));

    [HttpDelete("{customerCardId}")]
    public async Task<IActionResult> Delete(string customerCardId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteCustomerCardCommand(customerCardId), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateCustomerCardRequest(string CardholderName, string CardNumber, int ExpiryMonth, int ExpiryYear, string Cvv, bool IsDefault = false);
public sealed record VerifyCustomerCardRequest(string CustomerCardId, string CardNumber);