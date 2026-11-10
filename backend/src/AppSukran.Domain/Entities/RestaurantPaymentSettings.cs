using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// İşletmenin ödeme ayarları: QR ile masadan kart ödemesi alınıp alınmayacağı
/// (varsayılan kapalı) ve ödemelerin aktarılacağı banka hesabı.
///
/// Banka bilgileri PayTR'nin işletmeye para aktarımı için istediği bilgilerdir:
/// IBAN ve hesap sahibi (işletme unvanı + yetkili ad soyad).
/// </summary>
public sealed class RestaurantPaymentSettings : AggregateRoot
{
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

    /// <summary>Boşluksuz, büyük harfli Türkiye IBAN'ı (TR + 24 rakam). Boşsa girilmemiştir.</summary>
    public string Iban { get; set; } = string.Empty;

    /// <summary>Hesabın sahibi işletme/şirket unvanı (banka kaydındaki gibi).</summary>
    public string AccountHolderBusinessName { get; set; } = string.Empty;

    /// <summary>Hesap sahibinin (işletme yetkilisinin) adı soyadı.</summary>
    public string AccountHolderFullName { get; set; } = string.Empty;

    // --- Platform tarafı (yalnızca SuperAdmin değiştirir) -----------------------

    /// <summary>Ödemenin işletmeye aktarılmasına kadar geçen gün (valör). null = belirlenmedi.</summary>
    public int? PayoutSettlementDays { get; set; }

    /// <summary>Platformun masa ödemelerinden aldığı komisyon (%). null = belirlenmedi.</summary>
    public decimal? CommissionPercent { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
