using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Menus.Queries;

public sealed record GetMenuItemByIdQuery(string MenuItemId) : IRequest<MenuItemResponse?>;