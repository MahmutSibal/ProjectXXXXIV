using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Complaints.Queries;

public sealed class GetComplaintsQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetComplaintsQuery, IReadOnlyCollection<ComplaintResponse>>
{
    public async Task<IReadOnlyCollection<ComplaintResponse>> Handle(GetComplaintsQuery request, CancellationToken cancellationToken)
    {
        var items = await unitOfWork.Repository<Complaint>().GetAllAsync(cancellationToken);
        return items
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ComplaintResponse(x.Id, x.RestaurantId, x.RestaurantName, x.UserName, x.Content, x.Status, x.Response, x.CreatedAt))
            .ToList();
    }
}
