using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed record CreateRestaurantCommand(string Name, string Slug, string OwnerId, double Longitude, double Latitude, string Address) : IRequest<string>;