using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class AddRestaurantTableCommandHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard accessGuard,
    ISubscriptionGuard subscriptionGuard)
    : IRequestHandler<AddRestaurantTableCommand, RestaurantTableSessionDto>
{
    public async Task<RestaurantTableSessionDto> Handle(AddRestaurantTableCommand request, CancellationToken cancellationToken)
    {
        accessGuard.EnsureCanAccess(request.RestaurantId);

        var repository = unitOfWork.Repository<Restaurant>();
        var restaurant = await repository.GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        // Paketin masa limiti aşılamaz (Başlangıç paketi 15 masa).
        await subscriptionGuard.EnsureCanAddTableAsync(request.RestaurantId, restaurant.Tables.Count, cancellationToken);

        var tableNo = request.TableNo
            ?? (restaurant.Tables.Count == 0 ? 1 : restaurant.Tables.Max(t => t.TableNo) + 1);

        if (restaurant.Tables.Any(t => t.TableNo == tableNo))
        {
            throw new InvalidOperationException($"Table {tableNo} already exists.");
        }

        var table = new RestaurantTable
        {
            TableNo = tableNo,
            Status = RestaurantTableStatus.Available
        };
        restaurant.Tables.Add(table);

        await repository.ReplaceAsync(restaurant, cancellationToken);

        return new RestaurantTableSessionDto(table.TableNo, table.TableSessionId, table.QrToken, table.Status.ToString());
    }
}
