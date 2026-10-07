using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Complaints.Commands;

public sealed class CreateComplaintCommandHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<CreateComplaintCommand, string>
{
    public async Task<string> Handle(CreateComplaintCommand request, CancellationToken cancellationToken)
    {
        var entity = new Complaint
        {
            RestaurantId = string.IsNullOrWhiteSpace(request.RestaurantId) ? null : request.RestaurantId,
            RestaurantName = request.RestaurantName.Trim(),
            UserName = request.UserName.Trim(),
            Content = request.Content.Trim(),
            Status = ComplaintStatus.New,
            Response = string.Empty
        };

        await unitOfWork.Repository<Complaint>().InsertAsync(entity, cancellationToken);
        return entity.Id;
    }
}
