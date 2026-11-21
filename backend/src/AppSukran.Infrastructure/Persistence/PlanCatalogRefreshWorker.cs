using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Subscriptions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// SuperAdmin'in paket ayarlarını (fiyat, indirim, limitler) veritabanından okuyup
/// <see cref="Domain.Subscriptions.PlanCatalog"/>'a yükler: açılışta ve ardından dakikada bir.
///
/// Değişikliği yapan sunucu ayarları hemen yükler; düzenli yenileme, aynı veritabanını
/// kullanan DİĞER sunucuların (yedek) da en geç bir dakika içinde güncellenmesi içindir.
/// Yükleme başarısız olursa son bilinen ayarlar (ilk açılışta koddaki varsayılanlar) geçerli kalır.
/// </summary>
public sealed class PlanCatalogRefreshWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PlanCatalogRefreshWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                await PlanCatalogLoader.LoadAsync(unitOfWork, stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                // İlk açılışta migration henüz bitmemiş olabilir; bir sonraki turda tekrar denenir.
                logger.LogWarning(exception, "Paket ayarları yüklenemedi; son bilinen ayarlar kullanılıyor.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
