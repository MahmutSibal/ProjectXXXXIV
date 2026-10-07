using AppSukran.Application.Abstractions.Maintenance;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Maintenance;

/// <summary>
/// Singleton. <c>ServerDisabled</c> değerini kısa TTL ile bellekte tutar. Ayar bu örnekte
/// kaydedilince <see cref="Invalidate"/> ile hemen düşürülür. Birden çok örnek (web farm)
/// varsa diğerleri en geç TTL kadar sonra yeni değeri görür.
/// </summary>
public sealed class ServerShutdownState(IServiceScopeFactory scopeFactory, ILogger<ServerShutdownState> logger)
    : IServerShutdownState
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(5);

    private sealed record Snapshot(bool Disabled, long ExpiresAtTicks);

    private volatile Snapshot? _snapshot;
    private long _generation;

    public async Task<bool> IsDisabledAsync(CancellationToken cancellationToken = default)
    {
        var current = _snapshot;
        if (current is not null && Environment.TickCount64 < current.ExpiresAtTicks)
        {
            return current.Disabled;
        }

        var generationAtStart = Interlocked.Read(ref _generation);
        var disabled = false;

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var settings = await unitOfWork.Repository<MaintenanceSettings>()
                .GetByIdAsync(MaintenanceSettings.SingletonId, cancellationToken);
            disabled = settings?.ServerDisabled ?? false;
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Fail-open: okunamıyorsa kimseyi kilitleme. Hatalı durumu da kısa süre önbelleğe
            // alıyoruz ki veritabanı sorunu her istekte ek yük/log üretmesin.
            logger.LogWarning(exception, "Sunucu kapatma bayrağı okunamadı; istek geçirildi (fail-open).");
            disabled = false;
        }

        // Okuma sürerken Invalidate çağrıldıysa bu (eski olabilecek) sonucu saklama.
        if (Interlocked.Read(ref _generation) == generationAtStart)
        {
            _snapshot = new Snapshot(disabled, Environment.TickCount64 + (long)CacheTtl.TotalMilliseconds);
        }

        return disabled;
    }

    public void Invalidate()
    {
        Interlocked.Increment(ref _generation);
        _snapshot = null;
    }
}
