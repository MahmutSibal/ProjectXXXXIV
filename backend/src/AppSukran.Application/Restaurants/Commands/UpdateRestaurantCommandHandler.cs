using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class UpdateRestaurantCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard accessGuard) : IRequestHandler<UpdateRestaurantCommand>
{
    public async Task Handle(UpdateRestaurantCommand request, CancellationToken cancellationToken)
    {
        // Çapraz-restoran erişimini engelle: yalnızca kendi restoranı (veya SuperAdmin).
        accessGuard.EnsureCanAccess(request.RestaurantId);

        var repository = unitOfWork.Repository<Restaurant>();
        var restaurant = await repository.GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        restaurant.Name = request.Name.Trim();
        restaurant.Address = request.Address.Trim();
        restaurant.Longitude = request.Longitude;
        restaurant.Latitude = request.Latitude;

        await repository.ReplaceAsync(restaurant, cancellationToken);
    }
}
