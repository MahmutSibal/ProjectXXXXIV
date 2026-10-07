using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed class CreateSupportRequestCommandHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<CreateSupportRequestCommand, string>
{
    public async Task<string> Handle(CreateSupportRequestCommand request, CancellationToken cancellationToken)
    {
        var entity = new SupportRequest
        {
            RestaurantId = string.IsNullOrWhiteSpace(request.RestaurantId) ? null : request.RestaurantId,
            BusinessName = request.BusinessName.Trim(),
            Content = request.Content.Trim(),
            Phone = request.Phone.Trim(),
            IsCalled = false
        };

        await unitOfWork.Repository<SupportRequest>().InsertAsync(entity, cancellationToken);
        return entity.Id;
    }
}
