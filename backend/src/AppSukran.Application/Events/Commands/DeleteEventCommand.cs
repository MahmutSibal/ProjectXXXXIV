using MediatR;

namespace AppSukran.Application.Events.Commands;

public sealed record DeleteEventCommand(string EventId) : IRequest;
