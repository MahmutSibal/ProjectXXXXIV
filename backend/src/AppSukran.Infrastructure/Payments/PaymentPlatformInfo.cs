using AppSukran.Application.Abstractions.Payments;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Payments;

public sealed class PaymentPlatformInfo(IOptions<PaymentSettings> options) : IPaymentPlatformInfo
{
    // DependencyInjection'daki IPaymentGateway seçimiyle aynı kural: "Iyzico" dışı her şey simülasyondur.
    public bool GlobalProviderIsFake
        => !string.Equals(options.Value.Provider, "Iyzico", StringComparison.OrdinalIgnoreCase);

    public string DefaultIyzicoBaseUrl => options.Value.Iyzico.BaseUrl;
}
