using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Maintenance.Queries;

public sealed record PlatformStatusResponse(bool MaintenanceEnabled, string Message, bool ServerDisabled = false)
{
    public static PlatformStatusResponse Default { get; } = new(false, string.Empty, false);
}

/// <summary>
/// Herkese açık ve ucuz: arayüz bakım duyurusunu buradan okur. Hiçbir zaman hata
/// fırlatmaz; kayıt yoksa ya da okunamazsa "bakım yok, sunucu açık" döner.
/// Bakım yalnızca bir duyurudur; engelleme <c>ServerDisabled</c> için ara katmanda yapılır.
/// </summary>
public sealed record GetPlatformStatusQuery : IRequest<PlatformStatusResponse>;

public sealed class GetPlatformStatusQueryHandler(IUnitOfWork unitOfWork)
    : IRequestHandler<GetPlatformStatusQuery, PlatformStatusResponse>
{
    public async Task<PlatformStatusResponse> Handle(
        GetPlatformStatusQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var settings = await unitOfWork.Repository<MaintenanceSettings>()
                .GetByIdAsync(MaintenanceSettings.SingletonId, cancellationToken);

            if (settings is null)
            {
                return PlatformStatusResponse.Default;
            }

            return new PlatformStatusResponse(settings.IsEnabled, settings.Message ?? string.Empty, settings.ServerDisabled);
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Durum uç noktası asla düşmemeli (ör. migration henüz uygulanmamışsa tablo yoktur).
            return PlatformStatusResponse.Default;
        }
    }
}
