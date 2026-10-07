using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Menus.Queries;

public sealed class GetMenuItemByIdQueryHandler(IUnitOfWork unitOfWork) : IRequestHandler<GetMenuItemByIdQuery, MenuItemResponse?>
{
    public async Task<MenuItemResponse?> Handle(GetMenuItemByIdQuery request, CancellationToken cancellationToken)
    {
        var menuItem = await unitOfWork.Repository<MenuItem>().GetByIdAsync(request.MenuItemId, cancellationToken);
        return menuItem is null ? null : Map(menuItem);
    }

    private static MenuItemResponse Map(MenuItem menuItem)
        => new(menuItem.Id, menuItem.RestaurantId, menuItem.Category, menuItem.Name, menuItem.ImageUrl, menuItem.Ingredients, menuItem.Recipe, menuItem.AveragePreparationTime, menuItem.Price, menuItem.IsAvailable);
}