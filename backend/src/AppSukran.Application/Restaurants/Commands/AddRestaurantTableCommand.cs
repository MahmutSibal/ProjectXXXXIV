using AppSukran.Application.Restaurants.Dtos;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

// TableNo verilmezse (null) sıradaki numara otomatik atanır.
public sealed record AddRestaurantTableCommand(string RestaurantId, int? TableNo)
    : IRequest<RestaurantTableSessionDto>;
