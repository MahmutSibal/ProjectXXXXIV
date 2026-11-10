namespace AppSukran.Application.Abstractions.Payments;

/// <summary>
/// Masa ödemeleri için kullanılacak geçidi seçer. Platform abonelik akışları bunu
/// kullanmaz; onlar global <see cref="IPaymentGateway"/> ile devam eder.
/// </summary>
public interface IRestaurantPaymentGatewayResolver
{
    /// <exception cref="InvalidOperationException">
    /// İşletme online kart ödemesi almıyorsa ya da kart ödemesi şu an kullanılamıyorsa.
    /// </exception>
    Task<IPaymentGateway> ResolveAsync(string restaurantId, CancellationToken cancellationToken = default);
}

/// <summary>Platform düzeyindeki ödeme yapılandırmasının uygulama katmanına açılan bilgisi.</summary>
public interface IPaymentPlatformInfo
{
    /// <summary>Payment:Provider "Fake" (simülasyon) mü?</summary>
    bool GlobalProviderIsFake { get; }

    /// <summary>Kartla tahsilat yapabilen bir sağlayıcı bağlı mı? ("None" iken false.)</summary>
    bool CardPaymentsAvailable { get; }
}
