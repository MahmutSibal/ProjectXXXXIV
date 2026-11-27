using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace AppSukran.API.Caching;

/// <summary>
/// Restoran menüsü (ürünler ve kategoriler) için kısa ömürlü bellek önbelleği. Dolu bir
/// restoranda her misafir QR'ı okuttuğunda menü veritabanından yeniden okunmasın diye.
///
/// - Yanıt herkes için aynıdır (çağıranın rolüne göre değişmez), bu yüzden restoran başına tutulur.
/// - Menüyü değiştiren her istek (ürün/kategori ekleme-düzenleme-silme, stok/uygunluk, sipariş ile
///   stok düşümü) bu sunucudaki menü önbelleğinin tamamını siler (<see cref="InvalidatesMenuCacheAttribute"/>).
/// - İki backend varken silme yalnızca isteği alan sunucuda olur; diğerinde değer en geç
///   <see cref="Lifetime"/> sonra tazelenir. Normalde bütün istemciler ana sunucuda olduğu için
///   bu yalnızca failover anında görülür. Sipariş verilirken stok yine veritabanında denetlenir.
/// </summary>
public sealed class MenuResponseCache(IMemoryCache cache)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromSeconds(30);

    private CancellationTokenSource _version = new();
    private readonly Lock _gate = new();

    public async Task<T> GetOrCreateAsync<T>(string kind, string restaurantId, Func<Task<T>> factory)
    {
        var key = $"menu:{kind}:{restaurantId}";
        if (cache.TryGetValue(key, out T? cached) && cached is not null)
        {
            return cached;
        }

        CancellationToken version;
        lock (_gate) { version = _version.Token; }

        var value = await factory();
        // Okuma sürerken menü değiştiyse "version" zaten iptal edilmiştir ve kayıt hemen düşer:
        // eski menü önbelleğe yazılmaz.
        cache.Set(key, value, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = Lifetime }
            .AddExpirationToken(new CancellationChangeToken(version)));
        return value;
    }

    /// <summary>Bu sunucudaki bütün menü önbelleğini geçersiz kılar.</summary>
    public void Invalidate()
    {
        CancellationTokenSource old;
        lock (_gate)
        {
            old = _version;
            _version = new CancellationTokenSource();
        }
        old.Cancel();
        old.Dispose();
    }
}

/// <summary>
/// İşaretlenen controller/aksiyonlarda başarılı her veri değiştiren istekten (GET dışı) sonra
/// menü önbelleğini siler.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class InvalidatesMenuCacheAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        try
        {
            await next();
        }
        finally
        {
            // Hata olsa bile silmek zararsızdır (bir sonraki okuma veritabanından gelir); kısmen
            // uygulanmış bir değişikliğin eski menüyle gizlenmesinden iyidir.
            var method = context.HttpContext.Request.Method;
            if (!HttpMethods.IsGet(method) && !HttpMethods.IsHead(method))
            {
                context.HttpContext.RequestServices.GetRequiredService<MenuResponseCache>().Invalidate();
            }
        }
    }
}
