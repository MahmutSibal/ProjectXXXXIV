using AppSukran.Application.Common.Models;
using AppSukran.Application.Profile.Commands;
using AppSukran.Application.Profile.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ProfileController(IMediator mediator) : ControllerBase
{
    /// <summary>Oturum açan kullanıcının profil bilgisi.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> GetMe(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetCurrentUserQuery(), cancellationToken));

    /// <summary>Profil adını günceller.</summary>
    [HttpPut("me")]
    public async Task<ActionResult<UserResponse>> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new UpdateProfileCommand(request.Name), cancellationToken));
}

public sealed record UpdateProfileRequest(string Name);
