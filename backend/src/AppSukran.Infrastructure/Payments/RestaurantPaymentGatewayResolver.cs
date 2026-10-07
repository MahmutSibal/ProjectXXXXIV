using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.PaymentSetup;
using AppSukran.Domain.Entities;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// Masa ödemeleri için işletmenin kendi üye iş yeri hesabına tahsilat yapan geçidi üretir.
/// Platform Fake ise simülasyon; değilse işletmenin şifreli anahtarlarıyla iyzico.
/// Platformun global iyzico anahtarları burada asla kullanılmaz.
/// </summary>
public sealed class RestaurantPaymentGatewayResolver(
    IUnitOfWork unitOfWork,
    ISecretProtectionService secretProtection,
    IPaymentPlatformInfo platformInfo,
    FakePaymentGateway fakeGateway,
    IyzicoPaymentGateway iyzicoGateway) : IRestaurantPaymentGatewayResolver
{
    private const string CardPaymentsOffMessage = "Online kart ödemesi şu anda kapalı.";
    private const string NotAcceptingMessage = "Bu işletme online kart ödemesi almıyor.";

    public async Task<IPaymentGateway> ResolveAsync(string restaurantId, CancellationToken cancellationToken = default)
    {
        var platform = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);
        if (platform is { CardPaymentsEnabled: false })
        {
            throw new InvalidOperationException(CardPaymentsOffMessage);
        }

        var settings = await unitOfWork.Repository<RestaurantPaymentSettings>()
            .GetByIdAsync(restaurantId, cancellationToken);

        if (settings is not { OnlinePaymentEnabled: true })
        {
            throw new InvalidOperationException(NotAcceptingMessage);
        }

        if (platformInfo.GlobalProviderIsFake)
        {
            return fakeGateway;
        }

        var credentials = RestaurantPaymentCredentials.TryDecrypt(settings, secretProtection)
            ?? throw new InvalidOperationException(NotAcceptingMessage);

        var baseUrl = RestaurantPaymentCredentials.NormalizeBaseUrl(settings.BaseUrl)
            ?? RestaurantPaymentCredentials.DefaultBaseUrl(platformInfo.DefaultIyzicoBaseUrl);

        return iyzicoGateway.ForMerchant(credentials.ApiKey, credentials.SecretKey, baseUrl);
    }
}
