using AppSukran.Application.Common.Models;
using AppSukran.Application.Events.Commands;
using AppSukran.Application.Events.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppSukran.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "RestaurantOwner")]
public sealed class EventsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<EventResponse>>> GetAll(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new GetEventsQuery(), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEventRequest request, CancellationToken cancellationToken)
    {
        var eventId = await mediator.Send(new CreateEventCommand(
            request.Title, request.Description, request.ImageUrl, request.Date, request.Time,
            request.Location, request.Price, request.IsFree, request.Tags ?? []), cancellationToken);
        return Ok(new { eventId });
    }

    [HttpPut("{eventId}")]
    public async Task<IActionResult> Update(string eventId, [FromBody] UpdateEventRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new UpdateEventCommand(
            eventId, request.Title, request.Description, request.ImageUrl, request.Date, request.Time,
            request.Location, request.Price, request.IsFree, request.Tags ?? [], request.IsPublished), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{eventId}")]
    public async Task<IActionResult> Delete(string eventId, CancellationToken cancellationToken)
    {
        await mediator.Send(new DeleteEventCommand(eventId), cancellationToken);
        return NoContent();
    }
}

public sealed record CreateEventRequest(
    string Title, string Description, string ImageUrl, string Date, string Time,
    string Location, long Price, bool IsFree, IReadOnlyCollection<string>? Tags);

public sealed record UpdateEventRequest(
    string Title, string Description, string ImageUrl, string Date, string Time,
    string Location, long Price, bool IsFree, IReadOnlyCollection<string>? Tags, bool IsPublished);
