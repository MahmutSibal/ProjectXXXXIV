using AppSukran.Domain.Entities;

namespace AppSukran.Application.Abstractions.Notifications;

public interface IOrderRealtimePublisher
{
    Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default);
    Task PublishOrderUpdatedAsync(Order order, CancellationToken cancellationToken = default);
}