namespace AppSukran.Application.Abstractions.Integrations;

public sealed record PosBridgeEvent(string BillId, string RestaurantId, int TableNo, long Amount, string PaymentMethod, string? PaidByUserId);

public interface IPosBridgeService
{
    Task NotifyPaymentCompletedAsync(PosBridgeEvent paymentEvent, CancellationToken cancellationToken = default);
}