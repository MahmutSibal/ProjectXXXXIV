namespace AppSukran.Application.Abstractions.Payments;

/// <summary>
/// Masa ödemeleri için işletmenin KENDİ ödeme hesabına tahsilat yapan geçidi seçer.
/// Platform abonelik akışları bunu kullanmaz; onlar global <see cref="IPaymentGateway"/> ile devam eder.
/// </summary>
public interface IRestaurantPaymentGatewayResolver
{
    /// <exception cref="InvalidOperationException">
    /// İşletme online kart ödemesi almıyorsa ("Bu işletme online kart ödemesi almıyor.").
    /// </exception>
    Task<IPaymentGateway> ResolveAsync(string restaurantId, CancellationToken cancellationToken = default);
}

/// <summary>Platform düzeyindeki ödeme yapılandırmasının uygulama katmanına açılan bilgisi.</summary>
public interface IPaymentPlatformInfo
{
    /// <summary>Payment:Provider "Fake" (simülasyon) mü?</summary>
    bool GlobalProviderIsFake { get; }

    /// <summary>Payment:Iyzico:BaseUrl (işletme adres seçmediyse varsayılan).</summary>
    string DefaultIyzicoBaseUrl { get; }
}
