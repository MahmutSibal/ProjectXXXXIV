using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>
/// Aboneliği iptal eder. Ödemesi yapılmış dönem sonuna kadar hizmet sürer
/// (kullanıcı sözleşmesi 2.8: kısmi iade yapılmaz).
/// </summary>
public sealed record CancelSubscriptionCommand(string RestaurantId) : IRequest<Unit>;
