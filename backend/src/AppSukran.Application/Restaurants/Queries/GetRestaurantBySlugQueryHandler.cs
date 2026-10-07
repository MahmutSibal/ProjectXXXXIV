using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed class GetRestaurantBySlugQueryHandler(IRestaurantSearchService restaurantSearchService)
    : IRequestHandler<GetRestaurantBySlugQuery, RestaurantDetailResponse?>
{
    public async Task<RestaurantDetailResponse?> Handle(GetRestaurantBySlugQuery request, CancellationToken cancellationToken)
    {
        var restaurant = await restaurantSearchService.FindBySlugAsync(request.Slug, cancellationToken);
        return restaurant is null
            ? null
            : new RestaurantDetailResponse(
                restaurant.Id,
                restaurant.Slug,
                restaurant.Name,
                restaurant.Address,
                restaurant.Longitude,
                restaurant.Latitude);
    }
}
