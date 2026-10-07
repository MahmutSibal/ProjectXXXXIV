using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed class SetMenuItemAvailabilityCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard)
    : IRequestHandler<SetMenuItemAvailabilityCommand>
{
    public async Task Handle(SetMenuItemAvailabilityCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<MenuItem>();
        var menuItem = await repository.GetByIdAsync(request.MenuItemId, cancellationToken)
            ?? throw new InvalidOperationException("Menu item not found.");

        restaurantAccessGuard.EnsureCanAccess(menuItem.RestaurantId);

        menuItem.IsAvailable = request.IsAvailable;
        await repository.ReplaceAsync(menuItem, cancellationToken);
    }
}
