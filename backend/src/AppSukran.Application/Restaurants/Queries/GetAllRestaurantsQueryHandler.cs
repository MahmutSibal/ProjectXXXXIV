using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed class GetAllRestaurantsQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetAllRestaurantsQuery, IReadOnlyCollection<RestaurantDetailResponse>>
{
    public async Task<IReadOnlyCollection<RestaurantDetailResponse>> Handle(GetAllRestaurantsQuery request, CancellationToken cancellationToken)
    {
        var restaurants = await unitOfWork.Repository<Restaurant>().GetAllAsync(cancellationToken);
        return restaurants
            .OrderBy(restaurant => restaurant.Name)
            .Select(restaurant => new RestaurantDetailResponse(
                restaurant.Id,
                restaurant.Slug,
                restaurant.Name,
                restaurant.Address,
                restaurant.Longitude,
                restaurant.Latitude))
            .ToList();
    }
}
