using AppSukran.Application.Common.Models;
using MediatR;

namespace AppSukran.Application.Subscriptions.Commands;

/// <summary>
/// Abonelik yenilemesi için kart tanımlar.
///
/// Kart numarası SAKLANMAZ: ödeme sağlayıcısına gönderilir, dönen referanslar
/// (cardUserKey/cardToken) aboneliğe yazılır. Bu adımda TAHSİLAT YAPILMAZ —
/// deneme sürümü boyunca ücret alınmaz.
/// </summary>
public sealed record SaveSubscriptionCardCommand(
    string RestaurantId,
    string CardHolderName,
    string CardNumber,
    int ExpiryMonth,
    int ExpiryYear) : IRequest<SubscriptionResponse>;
