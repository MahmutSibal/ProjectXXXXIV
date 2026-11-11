using AppSukran.Application.Payments.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// Personelin masada alınan ödemeyi (nakit / restoranın kendi POS cihazı) işlemesi.
/// Müşterinin kartla online ödemesi bu uçlardan YAPILMAZ: kart bilgisi sunucumuza
/// hiç gelmez, tarayıcıdan doğrudan PayTR'ye gider (bkz. PayTrController).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,RestaurantOwner,Waiter,Kitchen")]
[EnableRateLimiting("payments-write")]
public sealed class PaymentsController(IMediator mediator) : ControllerBase
{
    [HttpPost("specific-items")]
    public async Task<IActionResult> PaySpecificItems([FromBody] PaySpecificItemsRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new PaySpecificItemsCommand(request.BillId, request.ItemIds, request.PaidByUserId), cancellationToken));

    [HttpPost("split-equally")]
    public async Task<IActionResult> SplitEqually([FromBody] SplitEquallyRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new SplitEquallyCommand(request.BillId, request.PersonCount, request.PaidByUserId), cancellationToken));

    [HttpPost("custom-amount")]
    public async Task<IActionResult> PayCustomAmount([FromBody] PayCustomAmountRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new PayCustomAmountCommand(request.BillId, request.Amount, request.PaidByUserId), cancellationToken));
}

public sealed record PaySpecificItemsRequest(string BillId, IReadOnlyCollection<string> ItemIds, string PaidByUserId);
public sealed record SplitEquallyRequest(string BillId, int PersonCount, string PaidByUserId);
public sealed record PayCustomAmountRequest(string BillId, long Amount, string PaidByUserId);
