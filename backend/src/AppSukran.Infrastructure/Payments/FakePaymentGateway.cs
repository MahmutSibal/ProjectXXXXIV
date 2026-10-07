using AppSukran.Application.Abstractions.Payments;
using AppSukran.Application.Abstractions.Security;
using Microsoft.Extensions.Logging;

namespace AppSukran.Infrastructure.Payments;

/// <summary>
/// Gerçek bir PSP gibi davranan, ağ çağrısı yapmayan simülasyon sağlayıcısı.
/// Geliştirme/test için varsayılan sağlayıcıdır. Luhn + son kullanma kontrolü yapar
/// ve test kart numaralarıyla belirli ret senaryolarını üretir.
///
/// Test kuralları (normalize edilmiş kart numarasının son 4 hanesi):
///   • 0002 → kart reddedildi (card_declined)
///   • 0119 → yetersiz bakiye (insufficient_funds)
///   • 0127 → hatalı CVC (invalid_cvc)
///   • diğer → Luhn + tarih geçerliyse başarılı
/// </summary>
public sealed class FakePaymentGateway(
    ICardNumberProtectionService cardProtectionService,
    ILogger<FakePaymentGateway> logger) : IPaymentGateway
{
    public string Provider => "Fake";

    public Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default)
    {
        if (request.AmountMinor <= 0)
        {
            return Task.FromResult(ChargeResult.Fail("invalid_amount", "Tahsilat tutarı sıfırdan büyük olmalı.", Provider));
        }

        var number = cardProtectionService.NormalizeCardNumber(request.Card.CardNumber);

        if (!cardProtectionService.IsValidCardNumber(number))
        {
            return Task.FromResult(ChargeResult.Fail("invalid_card", "Kart numarası geçersiz.", Provider));
        }

        if (!cardProtectionService.IsExpiryValid(request.Card.ExpiryMonth, request.Card.ExpiryYear))
        {
            return Task.FromResult(ChargeResult.Fail("expired_card", "Kartın son kullanma tarihi geçmiş.", Provider));
        }

        var last4 = number.Length >= 4 ? number[^4..] : number;
        var declined = last4 switch
        {
            "0002" => ChargeResult.Fail("card_declined", "Kart reddedildi.", Provider),
            "0119" => ChargeResult.Fail("insufficient_funds", "Yetersiz bakiye.", Provider),
            "0127" => ChargeResult.Fail("invalid_cvc", "Güvenlik kodu (CVC) hatalı.", Provider),
            _ => null,
        };

        if (declined is not null)
        {
            logger.LogInformation("[FakePayment] Charge DECLINED bill={BillId} amount={Amount} reason={Reason}",
                request.BillId, request.AmountMinor, declined.ErrorCode);
            return Task.FromResult(declined);
        }

        var transactionId = $"fake_{request.BillId}_{request.AmountMinor}_{Guid.NewGuid():N}";
        logger.LogInformation("[FakePayment] Charge APPROVED bill={BillId} amount={Amount} tx={Tx}",
            request.BillId, request.AmountMinor, transactionId);

        return Task.FromResult(ChargeResult.Ok(transactionId, Provider));
    }

    /// <summary>
    /// Simülasyonda kart "saklanır": gerçek bir sağlayıcıya gitmeden sahte anahtarlar
    /// üretilir. Böylece otomatik yenileme akışı iyzico olmadan da denenebilir.
    /// </summary>
    public Task<StoredCardResult> StoreCardAsync(StoreCardRequest request, CancellationToken cancellationToken = default)
    {
        var normalized = cardProtectionService.NormalizeCardNumber(request.CardNumber);

        if (normalized.Length < 12)
        {
            return Task.FromResult(StoredCardResult.Fail("Kart numarası geçersiz."));
        }

        var expiry = new DateTime(request.ExpiryYear, Math.Clamp(request.ExpiryMonth, 1, 12), 1).AddMonths(1);
        if (expiry <= DateTime.UtcNow)
        {
            return Task.FromResult(StoredCardResult.Fail("Kartın son kullanma tarihi geçmiş."));
        }

        logger.LogInformation("[Fake] Kart saklandı (simülasyon) externalId={ExternalId}", request.ExternalId);

        return Task.FromResult(StoredCardResult.Ok(
            $"fakeuser_{request.ExternalId}",
            $"faketoken_{Guid.NewGuid():N}",
            normalized[^4..],
            "Simulasyon"));
    }

    public Task<ChargeResult> ChargeStoredCardAsync(StoredCardChargeRequest request, CancellationToken cancellationToken = default)
    {
        if (request.AmountMinor <= 0)
        {
            return Task.FromResult(ChargeResult.Fail("invalid_amount", "Tahsilat tutarı sıfırdan büyük olmalı.", Provider));
        }

        if (string.IsNullOrWhiteSpace(request.CardUserKey) || string.IsNullOrWhiteSpace(request.CardToken))
        {
            return Task.FromResult(ChargeResult.Fail("no_stored_card", "Saklı kart bulunamadı.", Provider));
        }

        logger.LogInformation("[Fake] Saklı kartla tahsilat (simülasyon) ref={Reference}", request.ReferenceId);
        return Task.FromResult(ChargeResult.Ok($"fake_stored_{request.ReferenceId}_{request.AmountMinor}", Provider));
    }
}
