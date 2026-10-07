using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Menus.Queries;

public sealed record GetMenuItemsByRestaurantQuery(string RestaurantId) : IRequest<IReadOnlyCollection<MenuItemResponse>>;