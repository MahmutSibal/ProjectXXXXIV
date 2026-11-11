namespace AppSukran.Application.Abstractions.Payments;

/// <summary>Platform düzeyindeki ödeme yapılandırmasının uygulama katmanına açılan bilgisi.</summary>
public interface IPaymentPlatformInfo
{
    /// <summary>PayTR test modunda mı? (Gerçek para çekilmez.)</summary>
    bool GlobalProviderIsFake { get; }

    /// <summary>Kartla tahsilat yapılabilir mi? (PayTR anahtarları tanımlı ve açık.)</summary>
    bool CardPaymentsAvailable { get; }
}

/// <summary>Sepetteki bir satır. Fiyat kuruş cinsindendir.</summary>
public sealed record PayTrBasketLine(string Name, long UnitPriceMinor, int Quantity);

/// <param name="MerchantOid">Bizim ürettiğimiz benzersiz sipariş no (yalnızca harf/rakam).</param>
/// <param name="UserIp">Müşterinin gerçek IP adresi (PayTR imzaya dahil eder).</param>
/// <param name="Email">Müşterinin e-postası (PayTR zorunlu tutar; bizde SAKLANMAZ).</param>
public sealed record PayTrFormRequest(
    string MerchantOid,
    string UserIp,
    string Email,
    long AmountMinor,
    IReadOnlyList<PayTrBasketLine> Basket,
    string OkUrl,
    string FailUrl);

/// <summary>
/// Tarayıcının PayTR'ye göndereceği form. Kart alanları (cc_owner, card_number,
/// expiry_month, expiry_year, cvv) ve müşteri adı/adresi/telefonu BURADA YOKTUR:
/// tarayıcı onları forma kendisi ekler ve doğrudan PayTR'ye gönderir. Sunucumuz
/// kart bilgisini hiç görmez.
/// </summary>
public sealed record PayTrForm(string PostUrl, IReadOnlyDictionary<string, string> Fields);

public sealed record PayTrTransferRequest(
    string MerchantOid,
    string TransId,
    long SubmerchantAmountMinor,
    long TotalAmountMinor,
    string TransferName,
    string TransferIban);

public sealed record PayTrTransferResult(bool Success, string? Reference, string? ErrorCode, string? ErrorMessage);

/// <summary>PayTR Direkt API ve Platform Transfer API istemcisi.</summary>
public interface IPayTrService
{
    bool IsConfigured { get; }

    bool TestMode { get; }

    /// <summary>Restoran hakedişinden kesilecek %1 stopajın hesaplanacağı KDV oranı (yemek için genelde %10).</summary>
    decimal FoodVatPercent { get; }

    bool TransfersEnabled { get; }

    PayTrForm CreatePaymentForm(PayTrFormRequest request);

    /// <summary>Bildirim (callback) imzasını doğrular. Yanlışsa istek PayTR'den gelmemiştir.</summary>
    bool VerifyCallback(string merchantOid, string status, string totalAmount, string hash);

    Task<PayTrTransferResult> RequestTransferAsync(PayTrTransferRequest request, CancellationToken cancellationToken = default);
}
