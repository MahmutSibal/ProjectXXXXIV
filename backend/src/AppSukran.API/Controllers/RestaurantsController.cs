using AppSukran.Application.Common.Models;
using AppSukran.Application.Restaurants.Commands;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Application.Restaurants.Queries;
using AppSukran.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class RestaurantsController(IMediator mediator) : ControllerBase
{
    [HttpGet("nearby")]
    public async Task<IActionResult> GetNearby([FromQuery] double longitude, [FromQuery] double latitude, [FromQuery] int maxDistanceMeters = 5000, CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(new GetNearbyRestaurantsQuery(longitude, latitude, maxDistanceMeters), cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    [Authorize(Roles = nameof(UserRole.SuperAdmin))]
    public async Task<ActionResult<IReadOnlyCollection<RestaurantDetailResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetAllRestaurantsQuery(), cancellationToken));

    [HttpGet("{restaurantId}")]
    public async Task<ActionResult<RestaurantDetailResponse>> GetById(string restaurantId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetRestaurantByIdQuery(restaurantId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<RestaurantDetailResponse>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetRestaurantBySlugQuery(slug), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("{restaurantId}/tables/{tableNo:int}/session")]
    public async Task<ActionResult<RestaurantTableSessionDto>> ValidateSession(string restaurantId, int tableNo, [FromQuery] string token, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new ValidateTableSessionQuery(restaurantId, tableNo, token), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = nameof(UserRole.SuperAdmin))]
    public async Task<IActionResult> Create([FromBody] CreateRestaurantRequest request, CancellationToken cancellationToken)
    {
        var restaurantId = await mediator.Send(new CreateRestaurantCommand(request.Name, request.Slug, request.OwnerId, request.Longitude, request.Latitude, request.Address), cancellationToken);
        return Ok(new { restaurantId });
    }

    [HttpPut("{restaurantId}")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner")]
    public async Task<IActionResult> Update(string restaurantId, [FromBody] UpdateRestaurantRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateRestaurantCommand(restaurantId, request.Name, request.Address, request.Longitude, request.Latitude), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateRestaurantRequest(string Name, string Slug, string OwnerId, double Longitude, double Latitude, string Address);
public sealed record UpdateRestaurantRequest(string Name, string Address, double Longitude, double Latitude);
