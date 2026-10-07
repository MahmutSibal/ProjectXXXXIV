using MediatR;

namespace AppSukran.Application.Events.Commands;

public sealed record UpdateEventCommand(
    string EventId,
    string Title,
    string Description,
    string ImageUrl,
    string Date,
    string Time,
    string Location,
    long Price,
    bool IsFree,
    IReadOnlyCollection<string> Tags,
    bool IsPublished) : IRequest;
