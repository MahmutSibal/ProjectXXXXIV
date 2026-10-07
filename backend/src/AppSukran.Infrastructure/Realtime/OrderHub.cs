using System.Security.Claims;
using AppSukran.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AppSukran.Infrastructure.Realtime;

/// <summary>
/// Sipariş değişikliklerini canlı olarak ilgili ekranlara taşır.
///
/// Bir bağlantının hangi gruba girdiği, kiracı ayrımının tamamıdır — grup
/// seçimi istemciye BIRAKILMAZ, token'daki claim'lerden türetilir.
/// </summary>
[Authorize]
public sealed class OrderHub : Hub
{
    /// <summary>
    /// Bağlantıyı, kimliğine uygun gruba ekler.
    ///
    /// Grup üyeliği bağlantı kurulurken belirlenir; istemcinin ayrıca bir metot
    /// çağırmasına gerek yoktur. Yeniden bağlanmalarda da çalışır — SignalR
    /// yeniden bağlanınca grup üyelikleri sıfırlanır, elle yönetilseydi sessizce
    /// kaybolur ve bildirimler durmuş olurdu.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var group = GroupFor(Context.User);

        if (group is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Bağlantının dinleyeceği grubu belirler.
    ///
    /// QR ile bağlanan müşterinin token'ında da restaurantId bulunur; yalnızca
    /// ona bakılsaydı misafir, restoranın BÜTÜN masalarının siparişlerini
    /// izleyebilirdi. Bu yüzden müşteri rolü masa grubuna yönlendirilir.
    /// </summary>
    private static string? GroupFor(ClaimsPrincipal? user)
    {
        var restaurantId = user?.FindFirstValue("restaurantId");

        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            // Restorana bağlı olmayan hesap (ör. SuperAdmin) sipariş akışına girmez;
            // hangi restoranınkini alacağı belirsiz olurdu.
            return null;
        }

        if (user!.IsInRole(nameof(UserRole.Customer)))
        {
            var rawTableNo = user.FindFirstValue("tableNo");

            // Masa numarası okunamıyorsa hiçbir gruba almıyoruz. Restoran grubuna
            // düşürmek "güvenli taraf" değil, tam tersi olurdu.
            return int.TryParse(rawTableNo, out var tableNo)
                ? OrderGroups.Table(restaurantId, tableNo)
                : null;
        }

        return OrderGroups.Restaurant(restaurantId);
    }
}
