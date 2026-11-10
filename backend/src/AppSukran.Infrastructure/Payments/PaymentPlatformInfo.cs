using AppSukran.Application.Abstractions.Payments;
using AppSukran.Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace AppSukran.Infrastructure.Payments;

public sealed class PaymentPlatformInfo(IOptions<PaymentSettings> options) : IPaymentPlatformInfo
{
    // DependencyInjection'daki IPaymentGateway seçimiyle aynı kural.
    public bool GlobalProviderIsFake => options.Value.IsFake;

    // Şu an kart tahsil edebilen tek sağlayıcı simülasyondur; PayTR eklenince genişler.
    public bool CardPaymentsAvailable => options.Value.IsFake;
}
