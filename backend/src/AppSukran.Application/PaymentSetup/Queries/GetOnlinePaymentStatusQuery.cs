using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.PaymentSetup.Queries;

public sealed record OnlinePaymentStatusResponse(bool Enabled);

/// <summary>
/// Herkese açık: QR menüsü kart ödeme seçeneğini gösterip göstermeyeceğini buradan öğrenir.
/// Ayar satırı olmayan işletmede kapalıdır (açık onay/opt-in).
/// </summary>
public sealed record GetOnlinePaymentStatusQuery(string RestaurantId) : IRequest<OnlinePaymentStatusResponse>;

public sealed class GetOnlinePaymentStatusQueryHandler(
    IUnitOfWork unitOfWork,
    IPaymentPlatformInfo platformInfo)
    : IRequestHandler<GetOnlinePaymentStatusQuery, OnlinePaymentStatusResponse>
{
    public async Task<OnlinePaymentStatusResponse> Handle(
        GetOnlinePaymentStatusQuery request, CancellationToken cancellationToken)
    {
        // Kart tahsil edebilen bir sağlayıcı yoksa ya da platform ana anahtarı kapalıysa
        // işletme ayarına bakılmaksızın kart ödemesi kapalıdır.
        if (!platformInfo.CardPaymentsAvailable)
        {
            return new OnlinePaymentStatusResponse(false);
        }

        var platform = await unitOfWork.Repository<PlatformPaymentSettings>()
            .GetByIdAsync(PlatformPaymentSettings.SingletonId, cancellationToken);
        if (platform is { CardPaymentsEnabled: false })
        {
            return new OnlinePaymentStatusResponse(false);
        }

        var settings = await unitOfWork.Repository<RestaurantPaymentSettings>()
            .GetByIdAsync(request.RestaurantId, cancellationToken);

        return new OnlinePaymentStatusResponse(settings is { OnlinePaymentEnabled: true });
    }
}
