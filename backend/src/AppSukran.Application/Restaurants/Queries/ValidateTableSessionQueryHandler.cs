using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Restaurants.Queries;

public sealed class ValidateTableSessionQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<ValidateTableSessionQuery, RestaurantTableSessionDto?>
{
    public async Task<RestaurantTableSessionDto?> Handle(ValidateTableSessionQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.QrToken))
        {
            return null;
        }

        var restaurant = await unitOfWork.Repository<Restaurant>().GetByIdAsync(request.RestaurantId, cancellationToken);
        if (restaurant is null)
        {
            return null;
        }

        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo);
        if (table is null ||
            table.Status != RestaurantTableStatus.Occupied ||
            table.SessionClosedAt.HasValue ||
            string.IsNullOrEmpty(table.QrToken) ||
            !string.Equals(table.QrToken, request.QrToken, StringComparison.Ordinal))
        {
            return null;
        }

        return new RestaurantTableSessionDto(table.TableNo, table.TableSessionId, table.QrToken, table.Status.ToString());
    }
}
