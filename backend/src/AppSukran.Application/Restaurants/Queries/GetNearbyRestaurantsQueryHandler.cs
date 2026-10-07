using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed class GetNearbyRestaurantsQueryHandler(
    IRestaurantSearchService restaurantSearchService,
    IUnitOfWork unitOfWork)
    : IRequestHandler<GetNearbyRestaurantsQuery, IReadOnlyCollection<NearbyRestaurantDto>>
{
    public async Task<IReadOnlyCollection<NearbyRestaurantDto>> Handle(GetNearbyRestaurantsQuery request, CancellationToken cancellationToken)
    {
        var nearby = await restaurantSearchService.FindNearbyAsync(request.Longitude, request.Latitude, request.MaxDistanceMeters, cancellationToken);

        if (nearby.Count == 0)
        {
            return nearby;
        }

        // Restoran başına ortalama puan ve yorum sayısını hesapla.
        // Yalnızca yakındaki restoranların yorumlarını çekiyoruz: aksi hâlde platformdaki
        // TÜM yorumlar (tepki ve yanıtlarıyla birlikte) her keşif isteğinde belleğe gelir.
        var nearbyIds = nearby.Select(restaurant => restaurant.Id).ToList();
        var reviews = await unitOfWork.Repository<Review>()
            .FindAsync(review => nearbyIds.Contains(review.RestaurantId), cancellationToken);

        var ratingByRestaurant = reviews
            .GroupBy(review => review.RestaurantId)
            .ToDictionary(
                group => group.Key,
                group => (Average: group.Average(r => r.Rating), Count: group.Count()));

        return nearby
            .Select(restaurant =>
            {
                if (ratingByRestaurant.TryGetValue(restaurant.Id, out var stats))
                {
                    return restaurant with
                    {
                        AverageRating = Math.Round(stats.Average, 1),
                        ReviewCount = stats.Count
                    };
                }
                return restaurant;
            })
            // Keşfette yüksek puanlılar öne çıksın; eşitlikte çok yorumlu, sonra yakın olan üstte.
            .OrderByDescending(restaurant => restaurant.AverageRating)
            .ThenByDescending(restaurant => restaurant.ReviewCount)
            .ThenBy(restaurant => restaurant.DistanceMeters)
            .ToList();
    }
}
