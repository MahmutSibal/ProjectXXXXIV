using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Models;

public sealed record UserResponse(
    string Id,
    string Name,
    string Email,
    UserRole Role,
    string? RestaurantId,
    bool IsActive,
    string? Phone = null,
    string? Address = null,
    bool MarketingConsent = false);
