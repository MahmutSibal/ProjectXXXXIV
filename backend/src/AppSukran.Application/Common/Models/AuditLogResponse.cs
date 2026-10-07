using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Models;

/// <param name="Action">Teknik kod (filtreleme/denetim için korunur).</param>
/// <param name="ActionLabel">Kullanıcıya gösterilecek Türkçe karşılığı.</param>
public sealed record AuditLogResponse(
    string Id,
    string Action,
    string ActionLabel,
    string EntityType,
    string EntityId,
    string Details,
    string? ActorUserId,
    string? ActorName,
    UserRole? ActorRole,
    DateTime CreatedAt);
