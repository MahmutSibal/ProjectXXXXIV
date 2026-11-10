namespace AppSukran.Application.Common.Models;

/// <param name="Reply">SuperAdmin'in cevabı; henüz cevaplanmadıysa null.</param>
public sealed record SupportRequestResponse(
    string Id,
    string? RestaurantId,
    string BusinessName,
    string Content,
    string Phone,
    bool IsCalled,
    DateTime CreatedAt,
    string? Reply = null,
    DateTime? RepliedAt = null,
    string? Topic = null);
