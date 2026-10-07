using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Menus.Commands;

public sealed class CreateMenuItemCommandHandler(IUnitOfWork unitOfWork, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<CreateMenuItemCommand, string>
{
    public async Task<string> Handle(CreateMenuItemCommand request, CancellationToken cancellationToken)
    {
        // Çapraz-restoran koruması: kullanıcı yalnızca kendi restoranına ürün ekleyebilir.
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var menuItem = new MenuItem
        {
            RestaurantId = request.RestaurantId,
            Category = request.Category.Trim(),
            Name = request.Name.Trim(),
            ImageUrl = request.ImageUrl.Trim(),
            Ingredients = request.Ingredients.Select(ingredient => ingredient.Trim()).Where(ingredient => !string.IsNullOrWhiteSpace(ingredient)).ToList(),
            Recipe = string.IsNullOrWhiteSpace(request.Recipe) ? null : request.Recipe.Trim(),
            AveragePreparationTime = request.AveragePreparationTime,
            Price = request.Price,
            IsAvailable = request.IsAvailable
        };

        await unitOfWork.Repository<MenuItem>().InsertAsync(menuItem, cancellationToken);
        return menuItem.Id;
    }
}
