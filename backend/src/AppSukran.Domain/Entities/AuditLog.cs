using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

public sealed class AuditLog : AggregateRoot
{
    public string? ActorUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
}