using MediatR;

namespace AppSukran.Application.Complaints.Commands;

public sealed record CreateComplaintCommand(
    string RestaurantName,
    string UserName,
    string Content,
    string? RestaurantId) : IRequest<string>;
