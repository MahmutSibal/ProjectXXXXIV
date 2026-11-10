using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Queries;

/// <param name="Iban">Gösterim için 4'lü gruplara ayrılmış hâliyle döner (yalnızca işletmenin kendisine).</param>
/// <param name="CardPaymentsAvailable">Kartla tahsilat yapabilen bir ödeme sağlayıcısı bağlı mı?</param>
/// <param name="GlobalProviderIsFake">Platform ödeme sağlayıcısı simülasyonda (Fake) mı?</param>
public sealed record RestaurantPaymentSettingsResponse(
    bool OnlinePaymentEnabled,
    string Iban,
    string AccountHolderBusinessName,
    string AccountHolderFullName,
    bool CardPaymentsAvailable,
    bool GlobalProviderIsFake,
    bool CardPaymentsAllowedByPlatform = true,
    int? PayoutSettlementDays = null,
    decimal? CommissionPercent = null);

public sealed record GetRestaurantPaymentSettingsQuery(string RestaurantId) : IRequest<RestaurantPaymentSettingsResponse>;

public sealed class GetRestaurantPaymentSettingsQueryHandler(
    IUnitOfWork unitOfWork,
    IRestaurantAccessGuard restaurantAccessGuard,
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

        return new RestaurantPaymentSettingsResponse(
            settings?.OnlinePaymentEnabled ?? false,
            string.IsNullOrWhiteSpace(settings?.Iban) ? string.Empty : TurkishIban.Format(settings.Iban),
            settings?.AccountHolderBusinessName ?? string.Empty,
            settings?.AccountHolderFullName ?? string.Empty,
            platformInfo.CardPaymentsAvailable,
            platformInfo.GlobalProviderIsFake,
            platform?.CardPaymentsEnabled ?? true,
            settings?.PayoutSettlementDays,
            settings?.CommissionPercent);
    }
}
