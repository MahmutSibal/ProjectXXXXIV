using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// Masa ödemeleri için geçidi seçer. Şu an kart tahsil edebilen tek sağlayıcı
/// simülasyondur (Payment:Provider = "Fake"); production'da ("None") kart ödemesi
/// açıkça reddedilir. PayTR entegrasyonu eklendiğinde işletmenin ödeme ayarlarıyla
/// (IBAN, hesap sahibi) çalışan geçit burada üretilecek.
/// </summary>
public sealed class RestaurantPaymentGatewayResolver(
    IUnitOfWork unitOfWork,
    IPaymentPlatformInfo platformInfo,
    FakePaymentGateway fakeGateway) : IRestaurantPaymentGatewayResolver
{
    private const string CardPaymentsOffMessage = "Online kart ödemesi şu anda kapalı.";
    private const string NotAcceptingMessage = "Bu işletme online kart ödemesi almıyor.";

    public async Task<IPaymentGateway> ResolveAsync(string restaurantId, CancellationToken cancellationToken = default)
    {
        var platform = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);
        if (platform is { CardPaymentsEnabled: false } || !platformInfo.CardPaymentsAvailable)
        {
            throw new InvalidOperationException(CardPaymentsOffMessage);
        }

        var settings = await unitOfWork.Repository<RestaurantPaymentSettings>()
            .GetByIdAsync(restaurantId, cancellationToken);

        if (settings is not { OnlinePaymentEnabled: true })
        {
            throw new InvalidOperationException(NotAcceptingMessage);
        }

        return fakeGateway;
    }
}
