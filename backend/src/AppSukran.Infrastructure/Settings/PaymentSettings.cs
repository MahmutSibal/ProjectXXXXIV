namespace AppSukran.Infrastructure.Settings;

/// <summary>
/// Ödeme altyapısı ayarları. Sağlayıcı çalışma anında seçilir:
/// "Fake" (yerleşik simülasyon, varsayılan) veya "Iyzico" (gerçek PSP).
/// iyzico hesabı geldiğinde sadece appsettings'te Provider="Iyzico" yapıp
/// ApiKey/SecretKey girilmesi yeterlidir; kod değişikliği gerekmez.
/// </summary>
public sealed class PaymentSettings
{
    public string Provider { get; set; } = "Fake";

    /// <summary>ISO 4217 para birimi (TRY, USD, EUR...). Tutarlar kuruş (minor) cinsindendir.</summary>
    public string Currency { get; set; } = "TRY";

    public IyzicoSettings Iyzico { get; set; } = new();
}

public sealed class IyzicoSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Sandbox: https://sandbox-api.iyzipay.com — Canlı: https://api.iyzipay.com</summary>
    public string BaseUrl { get; set; } = "https://sandbox-api.iyzipay.com";

    /// <summary>
    /// QR ile masadan ödeyen misafirin e-postası yoktur; iyzico bu alanı zorunlu tutar.
    /// Vekil adres bu alan adıyla üretilir — kendi alan adınız olmalı.
    /// </summary>
    public string GuestEmailDomain { get; set; } = "sukranapp.com";

    /// <summary>
    /// TC kimlik numarası. Uygulama bu veriyi toplamadığı için iyzico'nun kabul ettiği
    /// varsayılan kullanılır. CANLIYA ALMADAN ÖNCE: üye iş yeri sözleşmenizin bu alanı
    /// zorunlu kılıp kılmadığını iyzico ile teyit edin.
    /// </summary>
    public string DefaultIdentityNumber { get; set; } = "11111111111";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(SecretKey);
}
