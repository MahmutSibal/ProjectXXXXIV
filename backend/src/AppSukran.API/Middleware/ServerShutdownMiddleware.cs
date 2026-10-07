using AppSukran.Application.Abstractions.Maintenance;
using AppSukran.Domain.Enums;

namespace AppSukran.API.Middleware;

/// <summary>
/// Yazılımsal sunucu kapatma. <c>MaintenanceSettings.ServerDisabled</c> açıkken, izin listesi
/// dışındaki her istek SuperAdmin değilse 503 döner. IIS sürecini DURDURMAZ (kimse geri
/// başlatamazdı); yalnızca istekleri reddeder.
///
/// Kimlik doğrulamadan SONRA çalışmalıdır ki <c>context.User</c> dolu olsun (SignalR'ın
/// "access_token" sorgu parametresi JwtBearer OnMessageReceived'de çözülür).
/// Bayrak okunamazsa FAIL-OPEN: istek geçirilir.
/// </summary>
public sealed class ServerShutdownMiddleware(
    RequestDelegate next,
    IServerShutdownState shutdownState,
    ILogger<ServerShutdownMiddleware> logger)
{
    private const string ResponseBody =
        "{\"type\":\"about:blank\",\"title\":\"Sunucu kapalı\",\"status\":503,\"errors\":[\"Sunucu şu anda kapalı.\"]}";

    // Yöntemden bağımsız izin verilen yollar (karşılaştırma büyük/küçük harf duyarsız).
    private static readonly HashSet<string> AllowedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/health",
        "/api/health/ready",
        "/api/auth/login",
        "/api/auth/refresh",
        "/api/auth/logout",
    };

    private const string StatusPath = "/api/platform-settings/status";

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsAllowListed(context.Request))
        {
            await next(context);
            return;
        }

        bool disabled;
        try
        {
            disabled = await shutdownState.IsDisabledAsync(context.RequestAborted);
        }
        catch (Exception exception) when (!context.RequestAborted.IsCancellationRequested)
        {
            logger.LogWarning(exception, "Sunucu kapatma bayrağı okunamadı; istek geçirildi (fail-open).");
            disabled = false;
        }

        if (!disabled || context.User.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            await next(context);
            return;
        }

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.Headers.RetryAfter = "60";
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(ResponseBody, context.RequestAborted);
    }

    private static bool IsAllowListed(HttpRequest request)
    {
        // CORS ön kontrolü (preflight) tarayıcıyı bozmasın.
        if (HttpMethods.IsOptions(request.Method))
        {
            return true;
        }

        var path = request.Path.Value ?? string.Empty;
        if (path.Length > 1 && path[^1] == '/')
        {
            path = path.TrimEnd('/');
        }

        if (AllowedPaths.Contains(path))
        {
            return true;
        }

        return HttpMethods.IsGet(request.Method)
            && string.Equals(path, StatusPath, StringComparison.OrdinalIgnoreCase);
    }
}
