using AppSukran.Application.Abstractions.Payments;

namespace AppSukran.Infrastructure.Payments;

public sealed class PaymentPlatformInfo(IPayTrService payTr) : IPaymentPlatformInfo
{
    public bool GlobalProviderIsFake => payTr.IsConfigured && payTr.TestMode;

    public bool CardPaymentsAvailable => payTr.IsConfigured;
}
