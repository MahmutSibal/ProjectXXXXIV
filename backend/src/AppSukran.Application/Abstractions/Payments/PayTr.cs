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

/// <summary>
/// Ödemeyi yapan kişinin iletişim bilgileri. PayTR her ödemede zorunlu tutar; biz
/// yalnızca PayTR'ye iletiriz, SAKLAMAYIZ.
/// </summary>
public sealed record PayTrBuyer(string Email, string FullName, string Address, string Phone);

/// <param name="MerchantOid">Bizim ürettiğimiz benzersiz sipariş no (yalnızca harf/rakam).</param>
/// <param name="UserIp">Müşterinin gerçek IP adresi (PayTR imzaya dahil eder).</param>
public sealed record PayTrIframeRequest(
    string MerchantOid,
    string UserIp,
    PayTrBuyer Buyer,
    long AmountMinor,
    IReadOnlyList<PayTrBasketLine> Basket,
    string OkUrl,
    string FailUrl);

/// <summary>Sonuç: PayTR'nin güvenli ödeme sayfası (kart bilgisi ve 3D Secure orada girilir).</summary>
public sealed record PayTrIframeResult(bool Success, string? PaymentPageUrl, string? Error);

public sealed record PayTrTransferRequest(
    string MerchantOid,
    string TransId,
    long SubmerchantAmountMinor,
    long TotalAmountMinor,
    string TransferName,
    string TransferIban);

public sealed record PayTrTransferResult(bool Success, string? Reference, string? ErrorCode, string? ErrorMessage);

/// <summary>
/// PayTR iFrame API ve Platform Transfer API istemcisi. iFrame API'de kart formu ve
/// 3D Secure PayTR'nin sayfasındadır; kart bilgisi uygulamamızda hiç girilmez.
/// </summary>
public interface IPayTrService
{
    bool IsConfigured { get; }

    bool TestMode { get; }

    /// <summary>Restoran hakedişinden kesilecek %1 stopajın hesaplanacağı KDV oranı (yemek için genelde %10).</summary>
    decimal FoodVatPercent { get; }

    bool TransfersEnabled { get; }

    /// <summary>Restorana özel oran girilmemişse uygulanan platform komisyonu (%).</summary>
    decimal DefaultCommissionPercent { get; }

    /// <summary>PayTR'den tek kullanımlık ödeme sayfası alır (sunucudan sunucuya istek).</summary>
    Task<PayTrIframeResult> CreatePaymentPageAsync(PayTrIframeRequest request, CancellationToken cancellationToken = default);

    /// <summary>Bildirim (callback) imzasını doğrular. Yanlışsa istek PayTR'den gelmemiştir.</summary>
    bool VerifyCallback(string merchantOid, string status, string totalAmount, string hash);

    Task<PayTrTransferResult> RequestTransferAsync(PayTrTransferRequest request, CancellationToken cancellationToken = default);
}
