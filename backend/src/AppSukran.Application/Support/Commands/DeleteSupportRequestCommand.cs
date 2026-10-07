using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed record DeleteSupportRequestCommand(string Id) : IRequest;
