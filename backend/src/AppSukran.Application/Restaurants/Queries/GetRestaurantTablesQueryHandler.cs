using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed class GetRestaurantTablesQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard accessGuard)
    : IRequestHandler<GetRestaurantTablesQuery, IReadOnlyCollection<RestaurantTableSessionDto>>
{
    public async Task<IReadOnlyCollection<RestaurantTableSessionDto>> Handle(GetRestaurantTablesQuery request, CancellationToken cancellationToken)
    {
        accessGuard.EnsureCanAccess(request.RestaurantId);

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        return restaurant.Tables
            .OrderBy(table => table.TableNo)
            .Select(table => new RestaurantTableSessionDto(
                table.TableNo,
                table.TableSessionId,
                table.QrToken,
                table.Status.ToString()))
            .ToList();
    }
}
