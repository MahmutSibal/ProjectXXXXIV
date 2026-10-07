namespace AppSukran.API.Middleware;

/// <summary>
/// Yaygın tarayıcı saldırılarına karşı standart güvenlik başlıklarını ekler.
/// API bir SPA'ya hizmet ettiği için CSP burada dar tutulur; asıl CSP'yi
/// frontend'i sunan web sunucusu (nginx vb.) göndermelidir.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        // MIME tipi tahminini kapat (yüklenen dosyaların script olarak çalıştırılmasını önler).
        headers["X-Content-Type-Options"] = "nosniff";

        // API yanıtlarının iframe içine gömülmesini engelle.
        headers["X-Frame-Options"] = "DENY";

        // Dış sitelere tam URL sızdırma.
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // API'nin kamera/mikrofon/konum gibi güçlü özelliklere ihtiyacı yok.
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";

        // Yüklenen görsellerin tarayıcıda aktif içerik olarak çalışmasını engelle.
        headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self' data:; frame-ancestors 'none'";

        await next(context);
    }
}
