using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed record UpdateRestaurantCommand(
    string RestaurantId,
    string Name,
    string Address,
    double Longitude,
    double Latitude) : IRequest;
