namespace AppSukran.Infrastructure.Settings;

/// <summary>
/// PayTR ayarları (bölüm adı: "PayTr").
///
/// Mağaza Parola ve Gizli Anahtar depoya / appsettings'e YAZILMAZ; production'da
/// SUKRAN_PAYTR_MERCHANT_KEY ve SUKRAN_PAYTR_MERCHANT_SALT ortam değişkenlerinden okunur.
/// Üçü de tanımlı değilse kart ödemesi kapalıdır.
/// </summary>
public sealed class PayTrSettings
{
    public bool Enabled { get; set; }

    public string MerchantId { get; set; } = string.Empty;

    public string MerchantKey { get; set; } = string.Empty;

    public string MerchantSalt { get; set; } = string.Empty;

    /// <summary>
    /// Test modu: gerçek para çekilmez, PayTR'nin test kartları kullanılır.
    /// Canlıya geçince false yapılmalı (mağaza PayTR'de canlı moda alındıktan sonra).
    /// </summary>
    public bool TestMode { get; set; } = true;

    /// <summary>PayTR adresi. Yalnızca yerel testte sahte sunucuya yönlendirmek için değiştirilir.</summary>
    public string ApiBaseUrl { get; set; } = "https://www.paytr.com";

    /// <summary>PayTR hata ayrıntılarını döndürür. Entegrasyon sürecinde açık kalmalı.</summary>
    public bool DebugOn { get; set; } = true;

    /// <summary>Ödeme sonrası müşterinin döneceği frontend adresi (ör. https://sukranapp.runasp.net).</summary>
    public string AppBaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>Stopaj (%1) hesabında kullanılan, satış fiyatına dahil KDV oranı.</summary>
    public decimal FoodVatPercent { get; set; } = 10;

    /// <summary>
    /// Restoran için ayrı oran girilmemişse uygulanan platform komisyonu (%). PayTR'nin kendi
    /// kesintisi bu paydan çıkar; %3'ün altı zarar ettirebilir.
    /// </summary>
    public decimal DefaultCommissionPercent { get; set; } = 5;

    /// <summary>
    /// Restoranlara otomatik transfer. PayTR test modunda transfer API'si çalışmadığı için
    /// varsayılan kapalıdır; canlıya geçince açılır.
    /// </summary>
    public bool TransfersEnabled { get; set; }

    public bool IsConfigured =>
        Enabled
        && !string.IsNullOrWhiteSpace(MerchantId)
        && !string.IsNullOrWhiteSpace(MerchantKey)
        && !string.IsNullOrWhiteSpace(MerchantSalt);
}
