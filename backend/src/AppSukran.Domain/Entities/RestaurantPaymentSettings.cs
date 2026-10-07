using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// İşletmenin masa ödemeleri için kendi iyzico üye iş yeri ayarları. Platform
/// işletmenin cirosuna dokunmaz: QR ile kart ödemesi yalnızca işletme bu ayarı
/// açıp kendi anahtarlarını girdiyse alınır (varsayılan kapalı).
///
/// HASSAS VERİ: API/gizli anahtarlar şifreli saklanır (<see cref="ApiKeyProtected"/>,
/// <see cref="SecretKeyProtected"/>); API yanıtlarında asla açık dönmez.
/// </summary>
public sealed class RestaurantPaymentSettings : AggregateRoot
{
    public const string IyzicoProvider = "iyzico";

    public RestaurantPaymentSettings()
    {
    }

    public RestaurantPaymentSettings(string restaurantId)
    {
        Id = restaurantId;
    }

    /// <summary>Anahtar restoran kimliğidir; her restoranın tek ayar satırı vardır.</summary>
    public string RestaurantId => Id;

    public bool OnlinePaymentEnabled { get; set; }

    public string Provider { get; set; } = IyzicoProvider;

    public string ApiKeyProtected { get; set; } = string.Empty;

    public string SecretKeyProtected { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
