using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Support.Commands;

public sealed class CreateSupportRequestCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    : IRequestHandler<CreateSupportRequestCommand, string>
{
    public async Task<string> Handle(CreateSupportRequestCommand request, CancellationToken cancellationToken)
    {
        // İşletmeye bağlı kullanıcının talebi her zaman KENDİ işletmesine yazılır;
        // istemcinin gönderdiği restaurantId'ye güvenilmez. İşletmesi olmayan
        // (taşınmak isteyen) kullanıcı için boş kalır.
        var restaurantId = currentUserService.RestaurantId;

        var entity = new SupportRequest
        {
            RestaurantId = string.IsNullOrWhiteSpace(restaurantId) ? null : restaurantId,
            CreatedByUserId = currentUserService.UserId,
            BusinessName = request.BusinessName.Trim(),
            Topic = string.IsNullOrWhiteSpace(request.Topic) ? null : request.Topic.Trim(),
            Content = request.Content.Trim(),
            Phone = request.Phone.Trim(),
            IsCalled = false
        };

        await unitOfWork.Repository<SupportRequest>().InsertAsync(entity, cancellationToken);
        return entity.Id;
    }
}
