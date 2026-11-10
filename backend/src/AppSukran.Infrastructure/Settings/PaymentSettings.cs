namespace AppSukran.Infrastructure.Settings;

/// <summary>
/// Ödeme altyapısı ayarları. Sağlayıcı çalışma anında seçilir:
///   "None" — gerçek sağlayıcı yok, her kart tahsilatı reddedilir (production varsayılanı)
///   "Fake" — yerleşik simülasyon, yalnızca geliştirme/test içindir
/// PayTR entegrasyonu eklendiğinde buraya "PayTR" seçeneği gelecek.
/// </summary>
public sealed class PaymentSettings
{
    public const string FakeProvider = "Fake";

    public string Provider { get; set; } = "None";

    /// <summary>ISO 4217 para birimi (TRY, USD, EUR...). Tutarlar kuruş (minor) cinsindendir.</summary>
    public string Currency { get; set; } = "TRY";

    public bool IsFake => string.Equals(Provider, FakeProvider, StringComparison.OrdinalIgnoreCase);
}
