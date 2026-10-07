using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Models;

public sealed record ComplaintResponse(
    string Id,
    string? RestaurantId,
    string RestaurantName,
    string UserName,
    string Content,
    ComplaintStatus Status,
    string Response,
    DateTime CreatedAt);
