using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Queries;

/// <param name="ApiKeyMasked">Örn. "sand••••3f". Açık API anahtarı ve gizli anahtar ASLA dönmez.</param>
/// <param name="GlobalProviderIsFake">Platform ödeme sağlayıcısı simülasyonda (Fake) mı?</param>
public sealed record RestaurantPaymentSettingsResponse(
    bool OnlinePaymentEnabled,
    string Provider,
    bool HasCredentials,
    string ApiKeyMasked,
    string BaseUrl,
    bool GlobalProviderIsFake,
    bool CardPaymentsAllowedByPlatform = true);

public sealed record GetRestaurantPaymentSettingsQuery(string RestaurantId) : IRequest<RestaurantPaymentSettingsResponse>;

public sealed class GetRestaurantPaymentSettingsQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
    ISecretProtectionService secretProtection,
    IPaymentPlatformInfo platformInfo)
    : IRequestHandler<GetRestaurantPaymentSettingsQuery, RestaurantPaymentSettingsResponse>
{
    public async Task<RestaurantPaymentSettingsResponse> Handle(
        GetRestaurantPaymentSettingsQuery request, CancellationToken cancellationToken)
    {
        restaurantAccessGuard.EnsureCanAccess(request.RestaurantId);

        var settings = await unitOfWork.Repository<RestaurantPaymentSettings>()
            .GetByIdAsync(request.RestaurantId, cancellationToken);

        var platform = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);

        var credentials =RestaurantPaymentCredentials.TryDecrypt(settings, secretProtection);
        var baseUrl = string.IsNullOrWhiteSpace(settings?.BaseUrl)
            ? RestaurantPaymentCredentials.DefaultBaseUrl(platformInfo.DefaultIyzicoBaseUrl)
            : settings.BaseUrl;

        return new RestaurantPaymentSettingsResponse(
            settings?.OnlinePaymentEnabled ?? false,
            settings?.Provider ?? RestaurantPaymentSettings.IyzicoProvider,
            credentials is not null,
            RestaurantPaymentCredentials.Mask(credentials?.ApiKey),
            baseUrl,
            platformInfo.GlobalProviderIsFake,
            platform?.CardPaymentsEnabled ?? true);
    }
}
