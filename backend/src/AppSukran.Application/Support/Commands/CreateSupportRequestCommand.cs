using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed record CreateSupportRequestCommand(
    string BusinessName,
    string Content,
    string Phone,
    string? RestaurantId) : IRequest<string>;
