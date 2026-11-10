using AppSukran.Application.Abstractions.Payments;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// Gerçek bir ödeme sağlayıcısı bağlı değilken (Payment:Provider = "None") kullanılır.
/// Her tahsilatı REDDEDER. Fake'e düşmek tehlikeli olurdu: simülasyon her kartı kabul
/// eder ve adisyonlar gerçekte para alınmadan "ödendi" görünürdü.
///
/// PayTR entegrasyonu eklendiğinde DependencyInjection'da "PayTR" seçeneği bunun yerini alır.
/// </summary>
public sealed class UnavailablePaymentGateway : IPaymentGateway
{
    public const string Message =
        "Kartla ödeme şu anda kullanılamıyor. Lütfen ödemeyi personele bildirin.";

    public string Provider => "None";

    public Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default)
        => Task.FromResult(ChargeResult.Fail("payment_unavailable", Message, Provider));
}
