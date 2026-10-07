using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class CloseRestaurantTableSessionCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService) : IRequestHandler<CloseRestaurantTableSessionCommand, RestaurantTableSessionDto>
{
    public async Task<RestaurantTableSessionDto> Handle(CloseRestaurantTableSessionCommand request, CancellationToken cancellationToken)
    {
        var restaurantRepository = unitOfWork.Repository<Restaurant>();
        var restaurant = await restaurantRepository.GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo)
            ?? throw new InvalidOperationException("Table not found.");

        table.Status = RestaurantTableStatus.Closed;
        table.TableSessionId = string.Empty;
        table.QrToken = string.Empty;
        table.SessionClosedAt = DateTime.UtcNow;

        await restaurantRepository.ReplaceAsync(restaurant, cancellationToken);
        await auditLogService.RecordAsync("TableSessionClosed", nameof(RestaurantTable), $"{restaurant.Id}:{table.TableNo}", "Table session closed.", currentUserService.UserId, cancellationToken);

        return new RestaurantTableSessionDto(table.TableNo, table.TableSessionId, table.QrToken, table.Status.ToString());
    }
}