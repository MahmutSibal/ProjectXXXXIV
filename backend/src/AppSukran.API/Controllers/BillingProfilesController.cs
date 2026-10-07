using AppSukran.Application.Billing.Commands;
using AppSukran.Application.Billing.Queries;
using AppSukran.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>
/// İşletmenin fatura ve kimlik bilgileri.
///
/// Yalnızca işletme sahibi ve SuperAdmin erişebilir; kimlik numaraları
/// yanıtlarda maskeli döner.
/// </summary>
[ApiController]
[Route("api/billing-profiles")]
[Authorize(Roles = "SuperAdmin,RestaurantOwner")]
public sealed class BillingProfilesController(IMediator mediator) : ControllerBase
{
    [HttpGet("restaurant/{restaurantId}")]
    public async Task<ActionResult<BillingProfileResponse>> Get(string restaurantId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetBillingProfileQuery(restaurantId), cancellationToken);
        return result is null ? NoContent() : Ok(result);
    }

    [HttpPut("restaurant/{restaurantId}")]
    public async Task<ActionResult<BillingProfileResponse>> Save(
        string restaurantId, [FromBody] SaveBillingProfileRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(
            new SaveBillingProfileCommand(
                restaurantId,
                request.ContactName,
                request.Email,
                request.Phone,
                request.NationalId,
                request.MersisNumber,
                request.AddressLine,
                request.City,
                request.Country,
                request.PostalCode),
            cancellationToken));
}

/// <param name="NationalId">Boş bırakılırsa kayıtlı değer korunur.</param>
public sealed record SaveBillingProfileRequest(
    string ContactName,
    string Email,
    string Phone,
    string? NationalId,
    string? MersisNumber,
    string AddressLine,
    string City,
    string Country,
    string PostalCode);
