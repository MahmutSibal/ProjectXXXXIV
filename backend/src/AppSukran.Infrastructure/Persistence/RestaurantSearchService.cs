using AppSukran.Application.Restaurants.Queries;
using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AppSukran.Infrastructure.Persistence;

public sealed class RestaurantSearchService(AppSukranDbContext context) : IRestaurantSearchService
{
    private const double EarthRadiusMeters = 6_371_000;

    public async Task<IReadOnlyCollection<NearbyRestaurantDto>> FindNearbyAsync(double longitude, double latitude, int maxDistanceMeters, CancellationToken cancellationToken = default)
    {
        var restaurants = await context.Restaurants.AsNoTracking().ToListAsync(cancellationToken);

        return restaurants
            .Select(restaurant => new NearbyRestaurantDto(
                restaurant.Id,
                restaurant.Slug,
                restaurant.Name,
                restaurant.Address,
                restaurant.Longitude,
                restaurant.Latitude,
                HaversineDistanceMeters(latitude, longitude, restaurant.Latitude, restaurant.Longitude)))
            .Where(dto => dto.DistanceMeters <= maxDistanceMeters)
            .OrderBy(dto => dto.DistanceMeters)
            .ToList();
    }

    public async Task<Restaurant?> FindBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        var normalized = slug.Trim().ToLowerInvariant();
        return await context.Restaurants.FirstOrDefaultAsync(restaurant => restaurant.Slug == normalized, cancellationToken);
    }

    private static double HaversineDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180;
}
