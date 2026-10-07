namespace AppSukran.Application.Abstractions.Payments;

/// <summary>Tahsilat için kullanılacak kart bilgileri (charge anında).</summary>
public sealed record PaymentCard(
    string CardHolderName,
    string CardNumber,
    int ExpiryMonth,
    int ExpiryYear,
    string? Cvc,
    string Brand,
    string Last4);

/// <summary>Bir ödeme sağlayıcısına yapılacak tahsilat isteği. Tutar kuruş (minor) cinsindendir.
/// Para birimi sağlayıcının kendi ayarından (PaymentSettings.Currency) okunur.</summary>
/// <param name="UseRestaurantMerchant">
/// Tahsilat işletmenin kendi üye iş yeri hesabına gider (masa ödemeleri). True iken
/// yalnızca işletmeye özel kimlik bilgileriyle kurulmuş bir geçit tahsil edebilir;
/// platformun global hesabı asla kullanılmaz.
/// </param>
public sealed record ChargeRequest(
    string BillId,
    string RestaurantId,
    int TableNo,
    long AmountMinor,
    string PaidByUserId,
    PaymentCard Card,
    bool UseRestaurantMerchant = false);

/// <summary>Tahsilat sonucu. Başarısızsa <see cref="ErrorCode"/>/<see cref="ErrorMessage"/> doldurulur.</summary>
public sealed record ChargeResult(
    bool Success,
    string Status,
    string? TransactionId,
    string Provider,
    string? ErrorCode = null,
    string? ErrorMessage = null)
{
    public static ChargeResult Ok(string transactionId, string provider) =>
        new(true, "Success", transactionId, provider);

    public static ChargeResult Fail(string errorCode, string errorMessage, string provider) =>
        new(false, "Failed", null, provider, errorCode, errorMessage);
}

/// <summary>
/// Ödeme sağlayıcısı soyutlaması. Somut implementasyonlar Infrastructure katmanındadır
/// (FakePaymentGateway, IyzicoPaymentGateway). Handler'lar bu arayüzü kullanır,
/// sağlayıcıdan habersizdir.
/// </summary>
public interface IPaymentGateway
{
    string Provider { get; }

    Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kartı sağlayıcıda saklar ve tahsilat YAPMAZ.
    ///
    /// Otomatik abonelik yenilemesi için gereklidir: kart numarasını biz saklamayız
    /// (PCI kapsamına girer), sağlayıcının döndürdüğü anahtarlarla sonradan tahsilat
    /// yaparız. Deneme sürümünde para çekilmediği için saklama ile tahsilat ayrıdır.
    /// </summary>
    Task<StoredCardResult> StoreCardAsync(StoreCardRequest request, CancellationToken cancellationToken = default);

    /// <summary>Daha önce saklanmış kartla tahsilat yapar (kart numarası gerekmez).</summary>
    Task<ChargeResult> ChargeStoredCardAsync(StoredCardChargeRequest request, CancellationToken cancellationToken = default);
}

/// <param name="ExternalId">Sağlayıcıda kartı ilişkilendireceğimiz kendi kimliğimiz (restoran).</param>
public sealed record StoreCardRequest(
    string ExternalId,
    string Email,
    string CardHolderName,
    string CardNumber,
    int ExpiryMonth,
    int ExpiryYear,
    string? CardAlias = null);

/// <param name="CardUserKey">Sağlayıcıdaki kullanıcı anahtarı.</param>
/// <param name="CardToken">Sağlayıcıdaki kart anahtarı. İkisi birlikte tahsilat için yeterlidir.</param>
public sealed record StoredCardResult(
    bool Success,
    string? CardUserKey,
    string? CardToken,
    string? Last4,
    string? Brand,
    string? ErrorMessage)
{
    public static StoredCardResult Ok(string cardUserKey, string cardToken, string? last4, string? brand) =>
        new(true, cardUserKey, cardToken, last4, brand, null);

    public static StoredCardResult Fail(string errorMessage) =>
        new(false, null, null, null, null, errorMessage);
}

public sealed record StoredCardChargeRequest(
    string ReferenceId,
    string CardUserKey,
    string CardToken,
    long AmountMinor,
    string BuyerId,
    string BuyerEmail,
    string BuyerName,
    string Description);
