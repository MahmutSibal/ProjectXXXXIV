using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed record SetSupportCalledCommand(string Id, bool IsCalled) : IRequest;
