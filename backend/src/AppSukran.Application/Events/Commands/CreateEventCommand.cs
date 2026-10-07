using MediatR;

namespace AppSukran.Application.Events.Commands;

public sealed record CreateEventCommand(
    string Title,
    string Description,
    string ImageUrl,
    string Date,
    string Time,
    string Location,
    long Price,
    bool IsFree,
    IReadOnlyCollection<string> Tags) : IRequest<string>;
