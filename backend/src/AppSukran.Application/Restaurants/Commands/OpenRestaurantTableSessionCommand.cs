using AppSukran.Application.Restaurants.Dtos;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed record OpenRestaurantTableSessionCommand(string RestaurantId, int TableNo) : IRequest<RestaurantTableSessionDto>;