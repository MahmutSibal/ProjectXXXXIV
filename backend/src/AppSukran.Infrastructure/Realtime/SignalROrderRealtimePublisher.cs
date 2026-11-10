using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Domain.Entities;
using Microsoft.AspNetCore.SignalR;

namespace AppSukran.Infrastructure.Realtime;

public sealed class SignalROrderRealtimePublisher(IHubContext<OrderHub> hubContext) : IOrderRealtimePublisher
{
    public Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default)
        => YayinlaAsync("orderCreated", order, cancellationToken);

    public Task PublishOrderUpdatedAsync(Order order, CancellationToken cancellationToken = default)
        => YayinlaAsync("orderUpdated", order, cancellationToken);

    // Yalnızca kimlik ve durum gönderilir: IBAN gibi kişisel veriler hub üzerinden yayılmaz,
    // ekranlar listeyi API'den yeniden çeker.
    public Task PublishRefundRequestChangedAsync(RefundRequest refundRequest, CancellationToken cancellationToken = default)
    {
        var payload = new { refundRequest.Id, refundRequest.TableNo, refundRequest.Status };
        return Task.WhenAll(
            hubContext.Clients
                .Group(OrderGroups.Restaurant(refundRequest.RestaurantId))
                .SendAsync("refundRequestChanged", payload, cancellationToken),
            hubContext.Clients
                .Group(OrderGroups.Table(refundRequest.RestaurantId, refundRequest.TableNo))
                .SendAsync("refundRequestChanged", payload, cancellationToken));
    }

    /// <summary>
    /// Olayı iki gruba birden gönderir: restoranın personeline ve yalnızca ilgili
    /// masadaki müşteriye.
    ///
    /// Bir bağlantı iki grubun yalnızca birinde bulunur (bkz. <see cref="OrderHub"/>),
    /// bu yüzden aynı olay kimseye iki kez ulaşmaz.
    /// </summary>
    private Task YayinlaAsync(string olay, Order order, CancellationToken cancellationToken)
        => Task.WhenAll(
            hubContext.Clients
                .Group(OrderGroups.Restaurant(order.RestaurantId))
                .SendAsync(olay, order, cancellationToken),
            hubContext.Clients
                .Group(OrderGroups.Table(order.RestaurantId, order.TableNo))
                .SendAsync(olay, order, cancellationToken));
}
