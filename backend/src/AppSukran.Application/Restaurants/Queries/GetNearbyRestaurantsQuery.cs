using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed record GetNearbyRestaurantsQuery(double Longitude, double Latitude, int MaxDistanceMeters = 5000) : IRequest<IReadOnlyCollection<NearbyRestaurantDto>>;

public sealed record NearbyRestaurantDto(
    string Id,
    string Slug,
    string Name,
    string Address,
    double Longitude,
    double Latitude,
    double DistanceMeters,
    double AverageRating = 0,
    int ReviewCount = 0);