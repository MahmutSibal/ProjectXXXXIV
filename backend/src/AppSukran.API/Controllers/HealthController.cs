using AppSukran.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppSukran.API.Controllers;

/// <summary>
/// Sunucunun ayakta olup olmadığını bildirir. Kimlik doğrulaması istemez;
/// barındırma sağlayıcısı ve dış izleme servisleri buraya oturum açmadan erişir.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public sealed class HealthController(AppSukranDbContext dbContext) : ControllerBase
{
    /// <summary>
    /// Hafif canlılık kontrolü — veritabanına dokunmaz.
    ///
    /// Paylaşımlı IIS barındırmada uygulama havuzu bir süre istek almazsa
    /// kapatılır; kapandığında <c>SubscriptionRenewalWorker</c> gibi arka plan
    /// servisleri de durur ve abonelik tahsilatları kaçar. Dışarıdan düzenli
    /// aralıklarla bu uç çağrılarak süreç ayakta tutulur, bu yüzden ucuz olmalı.
    /// </summary>
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        status = "ok",
        utc = DateTime.UtcNow,
    });

    /// <summary>
    /// Veritabanına gerçekten bağlanabildiğimizi doğrular (yayın sonrası kontrol).
    /// Canlılık ucundan ayrı tutuldu: veritabanı düşse bile süreç ayakta
    /// tutulmaya devam etmeli, aksi hâlde sağlayıcı süreci sürekli yeniden başlatır.
    /// </summary>
    [HttpGet("ready")]
    public async Task<IActionResult> GetReady(CancellationToken cancellationToken)
    {
        // Hata ayrıntısı (sunucu adı, kullanıcı) dışarıya sızmamalı; yalnızca
        // bağlanabildik/bağlanamadık bilgisi döner.
        var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);

        if (!canConnect)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "unavailable",
                database = false,
            });
        }

        var pending = await dbContext.Database.GetPendingMigrationsAsync(cancellationToken);

        return Ok(new
        {
            status = "ok",
            database = true,
            pendingMigrations = pending.Count(),
        });
    }
}
