namespace AppSukran.Application.Common.Models;

public sealed record SupportRequestResponse(
    string Id,
    string? RestaurantId,
    string BusinessName,
    string Content,
    string Phone,
    bool IsCalled,
    DateTime CreatedAt);
