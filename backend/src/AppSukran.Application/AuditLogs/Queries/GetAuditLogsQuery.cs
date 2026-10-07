using AppSukran.Application.Common.Models;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.AuditLogs.Queries;

/// <param name="Search">İşlem, açıklama veya kayıt türünde geçen metin.</param>
/// <param name="ActorRole">Verilirse yalnızca o roldeki kullanıcıların işlemleri.</param>
/// <param name="CreatedFrom">Dahil; bu tarih ve sonrası (UTC).</param>
/// <param name="CreatedTo">Hariç; bu tarihten öncesi (UTC).</param>
public sealed record GetAuditLogsQuery(
    int? Page = null,
    int? PageSize = null,
    string? Search = null,
    UserRole? ActorRole = null,
    DateTime? CreatedFrom = null,
    DateTime? CreatedTo = null) : IRequest<PagedResult<AuditLogResponse>>;
