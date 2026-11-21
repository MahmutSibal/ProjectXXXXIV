using AppSukran.Application.Campaigns;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

/// <summary>SuperAdmin kampanya e-postaları: alıcı sayısı, test gönderimi, gönderim ve geçmiş.</summary>
[ApiController]
[Route("api/admin/campaigns")]
[Authorize(Roles = "SuperAdmin")]
public sealed class CampaignsAdminController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<CampaignResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetCampaignsQuery(), cancellationToken));

    [HttpGet("audience")]
    public async Task<ActionResult<CampaignAudienceResponse>> Audience(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetCampaignAudienceQuery(), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CampaignResponse>> Send([FromBody] CampaignRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new SendCampaignCommand(request.Subject ?? string.Empty, request.Body ?? string.Empty, request.ImageUrl, request.ButtonText, request.ButtonUrl), cancellationToken));

    [HttpPost("test")]
    public async Task<ActionResult<CampaignTestResponse>> Test([FromBody] CampaignRequest request, CancellationToken cancellationToken)
    {
        var address = await mediator.Send(new SendCampaignTestCommand(request.Subject ?? string.Empty, request.Body ?? string.Empty, request.ImageUrl, request.ButtonText, request.ButtonUrl), cancellationToken);
        return Ok(new CampaignTestResponse(address));
    }
}

/// <summary>E-postadaki imzalı bağlantıdan kampanya iznini kapatır (giriş gerektirmez).</summary>
[ApiController]
[Route("api/campaigns")]
[AllowAnonymous]
public sealed class CampaignsPublicController(IMediator mediator) : ControllerBase
{
    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UnsubscribeCampaignCommand(request.UserId ?? string.Empty, request.Token ?? string.Empty), cancellationToken);
        return NoContent();
    }
}

public sealed record CampaignRequest(string? Subject, string? Body, string? ImageUrl = null, string? ButtonText = null, string? ButtonUrl = null);

public sealed record CampaignTestResponse(string SentTo);

public sealed record UnsubscribeRequest(string? UserId, string? Token);
