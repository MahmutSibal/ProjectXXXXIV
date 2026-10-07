using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Support.Queries;

public sealed class GetSupportRequestsQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetSupportRequestsQuery, IReadOnlyCollection<SupportRequestResponse>>
{
    public async Task<IReadOnlyCollection<SupportRequestResponse>> Handle(GetSupportRequestsQuery request, CancellationToken cancellationToken)
    {
        var items = await unitOfWork.Repository<SupportRequest>().GetAllAsync(cancellationToken);
        return items
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new SupportRequestResponse(x.Id, x.RestaurantId, x.BusinessName, x.Content, x.Phone, x.IsCalled, x.CreatedAt))
            .ToList();
    }
}
