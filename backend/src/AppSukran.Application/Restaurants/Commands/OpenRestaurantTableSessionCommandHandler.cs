using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Application.Restaurants.Dtos;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using MediatR;

namespace AppSukran.Application.Restaurants.Commands;

public sealed class OpenRestaurantTableSessionCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService, IRestaurantAccessGuard restaurantAccessGuard) : IRequestHandler<OpenRestaurantTableSessionCommand, RestaurantTableSessionDto>
{
    public async Task<RestaurantTableSessionDto> Handle(OpenRestaurantTableSessionCommand request, CancellationToken cancellationToken)
    {
        // Personel yalnızca kendi restoranının masasını açabilir. Eskiden bu kontrol yoktu:
        // başka bir restoranın masası açılabiliyor ve yanıtta o masanın QR anahtarı
        // dönüyordu (o masaya sahte sipariş verilebilirdi).
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var restaurantRepository = unitOfWork.Repository<Restaurant>();
        var restaurant = await restaurantRepository.GetByIdAsync(request.RestaurantId, cancellationToken)
            ?? throw new InvalidOperationException("Restaurant not found.");

        // Masa burada YARATILMAZ: masa ekleme paket sınırını denetleyen ayrı uçtan yapılır.
        // Eskiden olmayan masa numarasıyla oturum açmak paket sınırını aşmanın yoluydu.
        var table = restaurant.Tables.FirstOrDefault(candidate => candidate.TableNo == request.TableNo)
            ?? throw new InvalidOperationException("Masa bulunamadı. Önce masayı ekleyin.");

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