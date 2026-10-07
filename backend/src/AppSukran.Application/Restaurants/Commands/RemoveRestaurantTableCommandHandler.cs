using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class RemoveRestaurantTableCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard accessGuard) : IRequestHandler<RemoveRestaurantTableCommand>
{
    public async Task Handle(RemoveRestaurantTableCommand request, CancellationToken cancellationToken)
    {
        accessGuard.EnsureCanAccess(request.RestaurantId);

        var repository = unitOfWork.Repository<Restaurant>();
        var restaurant = await repository.GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        var table = restaurant.Tables.FirstOrDefault(t => t.TableNo == request.TableNo);
        if (table is null)
        {
            return;
        }

        restaurant.Tables.Remove(table);
        await repository.ReplaceAsync(restaurant, cancellationToken);
    }
}
