using AppSukran.Domain.Entities;

namespace AppSukran.Application.Abstractions.Notifications;

public interface IOrderRealtimePublisher
{
    Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default);
    Task PublishOrderUpdatedAsync(Order order, CancellationToken cancellationToken = default);

    /// <summary>İade talebi açıldı ya da durumu değişti; işletme ve mutfak ekranları listeyi yeniler.</summary>
    Task PublishRefundRequestChangedAsync(RefundRequest refundRequest, CancellationToken cancellationToken = default);

    /// <summary>Masadan garson çağrıldı; yalnızca restoranın personel ekranlarına gider.</summary>
    Task PublishWaiterCalledAsync(WaiterCallNotification notification, CancellationToken cancellationToken = default);
}

public sealed record WaiterCallNotification(
    string RestaurantId,
    int TableNo,
    AppSukran.Application.WaiterCalls.WaiterCallReason Reason,
    string? Note,
    DateTime CalledAt);