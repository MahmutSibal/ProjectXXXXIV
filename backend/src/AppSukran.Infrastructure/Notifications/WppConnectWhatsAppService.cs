using System.Net;
using System.Text;
using System.Text.Json;
using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Notifications;

/// <summary>
/// services/whatsapp altındaki wppconnect servisine HTTP ile bağlanır.
/// </summary>
public sealed class WppConnectWhatsAppService(
    HttpClient httpClient,
    IOptions<WhatsAppSettings> options,
    ILogger<WppConnectWhatsAppService> logger) : IWhatsAppService
{
    public bool IsEnabled => options.Value.Enabled && options.Value.IsConfigured;

    public Task<WhatsAppStatus> GetStatusAsync(CancellationToken cancellationToken = default)
        => CallAsync(HttpMethod.Get, "/status", null, cancellationToken);

    public Task<WhatsAppStatus> StartSessionAsync(CancellationToken cancellationToken = default)
        => CallAsync(HttpMethod.Post, "/session/start", null, cancellationToken);

    public Task<WhatsAppStatus> LogoutAsync(CancellationToken cancellationToken = default)
        => CallAsync(HttpMethod.Post, "/session/logout", null, cancellationToken);

    public async Task SendMessageAsync(string normalizedPhone, string message, CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var payload = JsonSerializer.Serialize(new { phone = normalizedPhone, message });
        using var request = BuildRequest(HttpMethod.Post, "/send", payload);

        HttpResponseMessage response;
        string body;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
            body = await response.Content.ReadAsStringAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "[WhatsApp] Servise ulaşılamadı");
            throw new WhatsAppException("WhatsApp servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
        }

        using (response)
        {
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            var errorCode = ExtractError(body);
            logger.LogWarning("[WhatsApp] Gönderim başarısız {Status} {Error}", (int)response.StatusCode, errorCode);

            throw new WhatsAppException(errorCode switch
            {
                "number_not_on_whatsapp" =>
                    "Bu numara WhatsApp'ta kayıtlı görünmüyor. Lütfen WhatsApp kullandığınız numarayı girin.",
                "not_connected" =>
                    "WhatsApp bağlantısı kurulu değil. Lütfen daha sonra tekrar deneyin.",
                _ => "Doğrulama mesajı gönderilemedi. Lütfen tekrar deneyin.",
            });
        }
    }

    private void EnsureEnabled()
    {
        if (!options.Value.Enabled)
        {
            throw new WhatsAppException("WhatsApp doğrulaması kapalı.");
        }

        if (!options.Value.IsConfigured)
        {
            throw new InvalidOperationException(
                "WhatsApp açık ancak servis jetonu yapılandırılmamış. " +
                "SUKRAN_WHATSAPP_TOKEN ortam değişkenini girin.");
        }
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string path, string? jsonBody)
    {
        var request = new HttpRequestMessage(method, options.Value.BaseUrl.TrimEnd('/') + path);
        request.Headers.TryAddWithoutValidation("x-service-token", options.Value.ServiceToken);

        if (jsonBody is not null)
        {
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
        }

        return request;
    }

    private async Task<WhatsAppStatus> CallAsync(
        HttpMethod method, string path, string? jsonBody, CancellationToken cancellationToken)
    {
        EnsureEnabled();

        using var request = BuildRequest(method, path, jsonBody);

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                throw new InvalidOperationException(
                    "WhatsApp servisi jetonu reddetti. Backend ve servisteki WHATSAPP_SERVICE_TOKEN aynı olmalı.");
            }

            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            return new WhatsAppStatus(
                root.TryGetProperty("status", out var status) ? status.GetString() ?? "unknown" : "unknown",
                root.TryGetProperty("qrDataUrl", out var qr) && qr.ValueKind is JsonValueKind.String ? qr.GetString() : null,
                root.TryGetProperty("phoneNumber", out var phone) && phone.ValueKind is JsonValueKind.String ? phone.GetString() : null,
                root.TryGetProperty("lastError", out var error) && error.ValueKind is JsonValueKind.String ? error.GetString() : null,
                root.TryGetProperty("connectedAt", out var connected) && connected.ValueKind is JsonValueKind.String
                    && DateTime.TryParse(connected.GetString(), out var parsed) ? parsed : null);
        }
        catch (Exception exception) when (exception is not InvalidOperationException)
        {
            logger.LogWarning(exception, "[WhatsApp] Durum sorgulanamadı");
            // Servis kapalıysa panelin çökmesi yerine "erişilemiyor" durumu gösterilir.
            return new WhatsAppStatus("unreachable", null, null, exception.Message, null);
        }
    }

    private static string ExtractError(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.TryGetProperty("error", out var error) ? error.GetString() ?? "unknown" : "unknown";
        }
        catch
        {
            return "unknown";
        }
    }
}
