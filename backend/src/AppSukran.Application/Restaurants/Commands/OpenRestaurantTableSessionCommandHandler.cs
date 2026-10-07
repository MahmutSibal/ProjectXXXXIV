using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class OpenRestaurantTableSessionCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService) : IRequestHandler<OpenRestaurantTableSessionCommand, RestaurantTableSessionDto>
{
    public async Task<RestaurantTableSessionDto> Handle(OpenRestaurantTableSessionCommand request, CancellationToken cancellationToken)
    {
        var restaurantRepository = unitOfWork.Repository<Restaurant>();
        var restaurant = await restaurantRepository.GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo);
        if (table is null)
        {
            table = new RestaurantTable { TableNo = request.TableNo };
            restaurant.Tables.Add(table);
        }

        table.TableSessionId = Guid.NewGuid().ToString("N");
        table.QrToken = Guid.NewGuid().ToString("N");
        table.SessionOpenedAt = DateTime.UtcNow;
        table.SessionClosedAt = null;
        table.Status = RestaurantTableStatus.Occupied;

        await restaurantRepository.ReplaceAsync(restaurant, cancellationToken);
        await auditLogService.RecordAsync("TableSessionOpened", nameof(RestaurantTable), $"{restaurant.Id}:{table.TableNo}", $"Session {table.TableSessionId} opened.", currentUserService.UserId, cancellationToken);

        return new RestaurantTableSessionDto(table.TableNo, table.TableSessionId, table.QrToken, table.Status.ToString());
    }
}