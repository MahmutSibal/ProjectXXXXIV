using AppSukran.Application.Menus.Commands;
using AppSukran.Application.Menus.Queries;
using AppSukran.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class MenuItemsController(IMediator mediator) : ControllerBase
{
    [HttpGet("{menuItemId}")]
    public async Task<ActionResult<MenuItemResponse?>> GetById(string menuItemId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetMenuItemByIdQuery(menuItemId), cancellationToken));

    [HttpGet("restaurant/{restaurantId}")]
    public async Task<ActionResult<IReadOnlyCollection<MenuItemResponse>>> GetByRestaurant(string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetMenuItemsByRestaurantQuery(restaurantId), cancellationToken));

    [HttpPost]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> Create([FromBody] CreateMenuItemCommand request, CancellationToken cancellationToken)
        => Ok(await mediator.Send(request, cancellationToken));

    [HttpPut("{menuItemId}")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> Update(string menuItemId, [FromBody] UpdateMenuItemRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateMenuItemCommand(menuItemId, request.Category, request.Name, request.ImageUrl, request.Ingredients, request.Recipe, request.AveragePreparationTime, request.Price, request.IsAvailable), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{menuItemId}")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> Delete(string menuItemId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteMenuItemCommand(menuItemId), cancellationToken);
        return NoContent();
    }

    // Mutfak personeli ürün adı/fiyatını değiştiremez, yalnızca stok/satış durumunu (var/tükendi) günceller.
    [HttpPut("{menuItemId}/availability")]
    [Authorize(Roles = "SuperAdmin,RestaurantOwner,Kitchen")]
    public async Task<IActionResult> SetAvailability(string menuItemId, [FromBody] SetMenuItemAvailabilityRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new SetMenuItemAvailabilityCommand(menuItemId, request.IsAvailable), cancellationToken);
        return NoContent();
    }
}

public sealed record UpdateMenuItemRequest(string Category, string Name, string ImageUrl, IReadOnlyCollection<string> Ingredients, string? Recipe, int AveragePreparationTime, long Price, bool IsAvailable);
public sealed record SetMenuItemAvailabilityRequest(bool IsAvailable);