using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed class GetRestaurantByIdQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetRestaurantByIdQuery, RestaurantDetailResponse?>
{
    public async Task<RestaurantDetailResponse?> Handle(GetRestaurantByIdQuery request, CancellationToken cancellationToken)
    {
        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken);
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
