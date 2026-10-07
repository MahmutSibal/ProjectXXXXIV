using System.Net.Http.Json;
using AppSukran.Application.Abstractions.Integrations;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Integrations;

public sealed class HttpPosBridgeService(HttpClient httpClient, IOptions<IntegrationSettings> options) : IPosBridgeService
{
    public async Task NotifyPaymentCompletedAsync(PosBridgeEvent paymentEvent, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.PosWebhookUrl))
        {
            return;
        }

        await httpClient.PostAsJsonAsync(settings.PosWebhookUrl, paymentEvent, cancellationToken);
    }
}