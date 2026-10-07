using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// İşletmenin fatura ve kimlik bilgileri. Abonelik faturası bu bilgilerle kesilir.
///
/// HASSAS VERİ: <see cref="NationalId"/> ve <see cref="MersisNumber"/> yetkisiz
/// kullanıcılara gösterilmez, loglara açık yazılmaz. API yanıtlarında maskeli
/// alanlar döner (bkz. <see cref="MaskedNationalId"/>).
/// </summary>
public sealed class BillingProfile : AggregateRoot
{
    /// <summary>Her restoranın tek fatura profili vardır.</summary>
    public string RestaurantId { get; set; } = string.Empty;

    /// <summary>Fatura muhatabı ad soyad.</summary>
    public string ContactName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    /// <summary>Normalize edilmiş telefon (ülke kodu dahil, yalnızca rakam).</summary>
    public string Phone { get; set; } = string.Empty;

    /// <summary>T.C. kimlik numarası (11 hane).</summary>
    public string NationalId { get; set; } = string.Empty;

    /// <summary>MERSİS numarası (16 hane). Şahıs işletmelerinde boş olabilir.</summary>
    public string? MersisNumber { get; set; }

    public string AddressLine { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string Country { get; set; } = "Türkiye";

    public string PostalCode { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string MaskedNationalId => TurkishIdentity.MaskNationalId(NationalId);

    public string? MaskedMersisNumber =>
        string.IsNullOrWhiteSpace(MersisNumber) ? null : TurkishIdentity.MaskMersis(MersisNumber);

    /// <summary>Fatura kesilebilmesi için gereken tüm alanlar dolu mu?</summary>
    public bool IsComplete =>
        !string.IsNullOrWhiteSpace(ContactName)
        && !string.IsNullOrWhiteSpace(Email)
        && !string.IsNullOrWhiteSpace(Phone)
        && !string.IsNullOrWhiteSpace(NationalId)
        && !string.IsNullOrWhiteSpace(AddressLine)
        && !string.IsNullOrWhiteSpace(City)
        && !string.IsNullOrWhiteSpace(Country)
        && !string.IsNullOrWhiteSpace(PostalCode);
}
