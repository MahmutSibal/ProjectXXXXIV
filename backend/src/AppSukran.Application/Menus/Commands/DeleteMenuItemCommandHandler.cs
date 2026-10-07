using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed class DeleteMenuItemCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<DeleteMenuItemCommand, Unit>
{
    public async Task<Unit> Handle(DeleteMenuItemCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<MenuItem>();
        var menuItem = await repository.GetByIdAsync(request.MenuItemId, cancellationToken)
            ?? throw new InvalidOperationException("Menu item not found.");

        // Çapraz-restoran koruması: ürün başka bir restorana aitse silme reddedilir.
        restaurantAccessGuard.EnsureCanAccess(menuItem.RestaurantId);

        await repository.DeleteAsync(request.MenuItemId, cancellationToken);
        return Unit.Value;
    }
}
