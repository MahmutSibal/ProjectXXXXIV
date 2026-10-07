using AppSukran.Domain.Entities;

namespace AppSukran.Application.Restaurants.Queries;

public interface IRestaurantSearchService
{
    Task<IReadOnlyCollection<NearbyRestaurantDto>> FindNearbyAsync(double longitude, double latitude, int maxDistanceMeters, CancellationToken cancellationToken = default);
    Task<Restaurant?> FindBySlugAsync(string slug, CancellationToken cancellationToken = default);
}