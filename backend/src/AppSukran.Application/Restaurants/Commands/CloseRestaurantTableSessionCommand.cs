using AppSukran.Application.Restaurants.Dtos;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed record CloseRestaurantTableSessionCommand(string RestaurantId, int TableNo) : IRequest<RestaurantTableSessionDto>;