using Microsoft.EntityFrameworkCore;

namespace AppSukran.Infrastructure.Persistence;

/// <summary>
/// SQL Server uygulama kilidi (sp_getapplock) ile "bu işi aynı anda yalnızca bir
/// sunucu yapsın" garantisi.
///
/// Backend birden fazla sunucuda (ana + yedek) aynı veritabanına bağlı çalışır.
/// Arka plan işleri her iki süreçte de döner; kilit olmadan iki sunucu aynı
/// aboneliği aynı anda yenileyip kartı İKİ KEZ çekebilirdi. Kilit veritabanında
/// tutulduğu için hangi sunucu ayaktaysa işi o yapar; biri düşerse diğeri devam eder.
///
/// Kilit oturuma (bağlantıya) bağlıdır: süreç çökerse bağlantı kopar ve SQL Server
/// kilidi kendiliğinden bırakır, sonsuza dek kilitli kalmaz.
/// </summary>
internal static class SqlApplicationLock
{
    /// <summary>
    /// Kilidi beklemeden almaya çalışır. Başka bir sunucu tutuyorsa <c>null</c> döner;
    /// çağıran bu turu atlamalıdır.
    /// </summary>
    public static async Task<IAsyncDisposable?> TryAcquireAsync(
        AppSukranDbContext context, string resource, CancellationToken cancellationToken)
    {
        // Bağlantıyı elle açık tutuyoruz: EF her sorguda bağlantıyı kapatıp açsaydı
        // oturuma bağlı kilit ilk sorgudan sonra düşerdi.
        await context.Database.OpenConnectionAsync(cancellationToken);

        try
        {
            await using var command = context.Database.GetDbConnection().CreateCommand();
            command.CommandText =
                "DECLARE @result int; " +
                "EXEC @result = sp_getapplock @Resource = @resource, @LockMode = 'Exclusive', " +
                "@LockOwner = 'Session', @LockTimeout = 0; " +
                "SELECT @result;";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@resource";
            parameter.Value = resource;
            command.Parameters.Add(parameter);

            // 0 ve 1 = alındı; negatif = alınamadı (zaman aşımı, kilitlenme, hata).
            var result = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
            if (result >= 0)
            {
                return new Releaser(context, resource);
            }
        }
        catch
        {
            await context.Database.CloseConnectionAsync();
            throw;
        }

        await context.Database.CloseConnectionAsync();
        return null;
    }

    private sealed class Releaser(AppSukranDbContext context, string resource) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            try
            {
                await using var command = context.Database.GetDbConnection().CreateCommand();
                command.CommandText = "EXEC sp_releaseapplock @Resource = @resource, @LockOwner = 'Session';";

                var parameter = command.CreateParameter();
                parameter.ParameterName = "@resource";
                parameter.Value = resource;
                command.Parameters.Add(parameter);

                await command.ExecuteNonQueryAsync();
            }
            finally
            {
                // Bırakma başarısız olsa bile bağlantıyı kapatmak kilidi düşürür.
                await context.Database.CloseConnectionAsync();
            }
        }
    }
}
