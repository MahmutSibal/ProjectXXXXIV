using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// Platformun (Şükran) havale/EFT ile abonelik ücreti tahsil etmek için gösterdiği
/// banka bilgileri. Tek satırlık singleton kayıttır (<see cref="SingletonId"/>).
/// Bu bilgiler herkese açık sayfalarda gösterilir; gizli değer içermez.
/// </summary>
public sealed class PlatformPaymentSettings : AggregateRoot
{
    public const string SingletonId = "default";

    public PlatformPaymentSettings()
    {
        Id = SingletonId;
    }

    public string BankName { get; set; } = string.Empty;

    public string AccountHolder { get; set; } = string.Empty;

    /// <summary>Boşluksuz, büyük harfli IBAN (örn. TR12...). Boşsa yapılandırılmamıştır.</summary>
    public string Iban { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;

    public string PaymentNote { get; set; } = string.Empty;

    /// <summary>
    /// Havale/EFT ödemesi açık mı? Kapalıyken banka bilgileri saklanır ama işletmelere ve
    /// herkese açık sayfalara hiç gösterilmez.
    /// </summary>
    public bool BankTransferEnabled { get; set; } = true;

    /// <summary>Web sitesinde iyzico logo bandı gösterilsin mi?</summary>
    public bool ShowIyzicoLogos { get; set; } = true;

    /// <summary>
    /// Platform genelinde online KART ödemesi ana anahtarı (masada misafir ödemesi).
    /// Kapalıyken işletmenin kendi ayarı ne olursa olsun kart tahsilatı yapılmaz.
    /// </summary>
    public bool CardPaymentsEnabled { get; set; } = true;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
