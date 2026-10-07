using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Menus.Queries;

public sealed class GetMenuItemsByRestaurantQueryHandler(IUnitOfWork unitOfWork) : IRequestHandler<GetMenuItemsByRestaurantQuery, IReadOnlyCollection<MenuItemResponse>>
{
    public async Task<IReadOnlyCollection<MenuItemResponse>> Handle(GetMenuItemsByRestaurantQuery request, CancellationToken cancellationToken)
    {
        var menuItems = await unitOfWork.Repository<MenuItem>()
            .FindAsync(menuItem => menuItem.RestaurantId == request.RestaurantId, cancellationToken);
        return menuItems.Select(Map).ToList();
    }

    private static MenuItemResponse Map(MenuItem menuItem)
        => new(menuItem.Id, menuItem.RestaurantId, menuItem.Category, menuItem.Name, menuItem.ImageUrl, menuItem.Ingredients, menuItem.Recipe, menuItem.AveragePreparationTime, menuItem.Price, menuItem.IsAvailable);
}