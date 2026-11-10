using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Support.Queries;

/// <summary>Giriş yapan kullanıcının açtığı destek talepleri ve cevapları (yeniden eskiye).</summary>
public sealed record GetMySupportRequestsQuery : IRequest<IReadOnlyCollection<SupportRequestResponse>>;

public sealed class GetMySupportRequestsQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<GetMySupportRequestsQuery, IReadOnlyCollection<SupportRequestResponse>>
{
    public async Task<IReadOnlyCollection<SupportRequestResponse>> Handle(
        GetMySupportRequestsQuery request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return [];
        }

        var items = await unitOfWork.Repository<SupportRequest>()
            .FindAsync(x => x.CreatedByUserId == userId, cancellationToken);

        return items
            .OrderByDescending(x => x.CreatedAt)
            .Select(SupportRequestMapping.ToResponse)
            .ToList();
    }
}

internal static class SupportRequestMapping
{
    public static SupportRequestResponse ToResponse(SupportRequest x) =>
        new(x.Id, x.RestaurantId, x.BusinessName, x.Content, x.Phone, x.IsCalled, x.CreatedAt, x.Reply, x.RepliedAt, x.Topic);
}
