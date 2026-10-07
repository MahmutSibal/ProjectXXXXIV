namespace AppSukran.Application.Abstractions.Logging;

public interface IAuditLogService
{
    Task RecordAsync(string action, string entityType, string entityId, string details, string? actorUserId = null, CancellationToken cancellationToken = default);
}