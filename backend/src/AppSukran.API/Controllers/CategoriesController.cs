using AppSukran.Application.Categories.Commands;
using AppSukran.Application.Categories.Queries;
using AppSukran.Application.Common.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CategoriesController(IMediator mediator) : ControllerBase
{
    [HttpGet("restaurant/{restaurantId}")]
    public async Task<ActionResult<IReadOnlyCollection<CategoryResponse>>> GetByRestaurant(string restaurantId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetCategoriesByRestaurantQuery(restaurantId), cancellationToken));

    [HttpPost]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var categoryId = await mediator.Send(request, cancellationToken);
        return Ok(new { categoryId });
    }

    [HttpPut("{categoryId}")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> Update(string categoryId, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateCategoryCommand(categoryId, request.Name, request.Description, request.ImageUrl), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{categoryId}")]
    [Authorize(Roles = "RestaurantOwner")]
    public async Task<IActionResult> Delete(string categoryId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteCategoryCommand(categoryId), cancellationToken);
        return NoContent();
    }
}

public sealed record UpdateCategoryRequest(string Name, string Description, string ImageUrl);
