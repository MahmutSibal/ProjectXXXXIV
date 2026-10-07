using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed class UpdateMenuItemCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<UpdateMenuItemCommand, Unit>
{
    public async Task<Unit> Handle(UpdateMenuItemCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<MenuItem>();
        var menuItem = await repository.GetByIdAsync(request.MenuItemId, cancellationToken)
            ?? throw new InvalidOperationException("Menu item not found.");

        // Çapraz-restoran koruması: ürün başka bir restorana aitse erişim reddedilir.
        restaurantAccessGuard.EnsureCanAccess(menuItem.RestaurantId);

        menuItem.Category = request.Category.Trim();
        menuItem.Name = request.Name.Trim();
        menuItem.ImageUrl = request.ImageUrl.Trim();
        menuItem.Ingredients = request.Ingredients.Select(ingredient => ingredient.Trim()).Where(ingredient => !string.IsNullOrWhiteSpace(ingredient)).ToList();
        menuItem.Recipe = string.IsNullOrWhiteSpace(request.Recipe) ? null : request.Recipe.Trim();
        menuItem.AveragePreparationTime = request.AveragePreparationTime;
        menuItem.Price = request.Price;
        menuItem.IsAvailable = request.IsAvailable;

        await repository.ReplaceAsync(menuItem, cancellationToken);
        return Unit.Value;
    }
}
