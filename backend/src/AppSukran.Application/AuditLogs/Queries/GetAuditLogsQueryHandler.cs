using System.Linq.Expressions;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.AuditLogs.Queries;

public sealed class GetAuditLogsQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetAuditLogsQuery, PagedResult<AuditLogResponse>>
{
    public async Task<PagedResult<AuditLogResponse>> Handle(GetAuditLogsQuery request, CancellationToken cancellationToken)
    {
        var userRepository = unitOfWork.Repository<User>();
        var page = new PageRequest(request.Page, request.PageSize);

        // Yetkiye göre filtreyi kur; arama, sıralama, sayfalama ve sayım veritabanında
        // uygulanır. Denetim kaydı tablosu sınırsız büyür, tamamını belleğe çekmek seçenek değil.
        // Arama istemcide yapılsaydı yalnızca açık sayfada arardı — kullanıcı için yanıltıcı olurdu.
        Expression<Func<AuditLog, bool>>? filter = null;

        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            var restaurantId = currentUserService.RestaurantId;
            if (string.IsNullOrWhiteSpace(restaurantId))
            {
                throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
            }

            // Owner yalnızca kendi restoranındaki kullanıcıların (kendisi + personeli) loglarını görür.
            var allowedUserIds = (await userRepository.FindAsync(u => u.RestaurantId == restaurantId, cancellationToken))
                .Select(u => u.Id)
                .ToList();

            filter = ExpressionComposer.AndNullable(filter, l => l.ActorUserId != null && allowedUserIds.Contains(l.ActorUserId));
        }

        if (request.ActorRole is { } role)
        {
            // Rol kullanıcıda tutulur, log kaydında değil: önce o roldeki kimlikleri bul.
            var roleUserIds = (await userRepository.FindAsync(u => u.Role == role, cancellationToken))
                .Select(u => u.Id)
                .ToList();

            filter = ExpressionComposer.AndNullable(filter, l => l.ActorUserId != null && roleUserIds.Contains(l.ActorUserId));
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            filter = ExpressionComposer.AndNullable(filter, l =>
                l.Action.Contains(term) || l.EntityType.Contains(term) ||
                (l.Details != null && l.Details.Contains(term)));
        }

        if (request.CreatedFrom is { } from)
        {
            filter = ExpressionComposer.AndNullable(filter, l => l.CreatedAt >= from);
        }

        if (request.CreatedTo is { } to)
        {
            filter = ExpressionComposer.AndNullable(filter, l => l.CreatedAt < to);
        }

        var auditLogRepository = unitOfWork.Repository<AuditLog>();
        var totalCount = await auditLogRepository.CountAsync(filter, cancellationToken);

        var logs = await auditLogRepository.QueryAsync(
            filter, l => l.CreatedAt, descending: true, page.Skip, page.PageSize, cancellationToken);

        // Aktör adlarını yalnızca dönen sayfadaki kullanıcılar için çek.
        var actorIds = logs
            .Select(l => l.ActorUserId)
            .Where(id => id != null)
            .Distinct()
            .ToList();

        var userById = actorIds.Count == 0
            ? new Dictionary<string, User>()
            : (await userRepository.FindAsync(u => actorIds.Contains(u.Id), cancellationToken))
                .ToDictionary(u => u.Id, u => u);

        var items = logs
            .Select(l =>
            {
                User? actor = null;
                if (l.ActorUserId != null)
                {
                    userById.TryGetValue(l.ActorUserId, out actor);
                }

                return new AuditLogResponse(
                    l.Id,
                    l.Action,
                    AuditActionLabels.For(l.Action),
                    l.EntityType,
                    l.EntityId,
                    l.Details,
                    l.ActorUserId,
                    actor?.Name,
                    actor?.Role,
                    l.CreatedAt);
            })
            .ToList();

        return new PagedResult<AuditLogResponse>(items, page.Page, page.PageSize, totalCount);
    }
}
