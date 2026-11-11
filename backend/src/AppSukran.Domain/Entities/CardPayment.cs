using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

/// <summary>
/// PayTR üzerinden alınan bir kart ödemesinin kaydı.
///
/// BİLEREK TUTULMAYANLAR: kart numarası, son kullanma tarihi, CVV, kart sahibi adı,
/// müşterinin adı / e-postası / telefonu / adresi. Bunlar tarayıcıdan doğrudan PayTR'ye
/// gider; ödeme kanıtı ve müşteri bilgisi PayTR'de tutulur. Bizde yalnızca siparişi
/// eşleştirmeye ve restorana transfer yapmaya yetecek kadar bilgi vardır.
/// </summary>
public class CardPayment : AggregateRoot
{
    /// <summary>60 dk içinde sonuç gelmeyen ödemeye yazılan sebep. Geç gelen başarılı bildirim yine işlenir.</summary>
    public const string TimeoutReason = "Zaman aşımı: PayTR'den sonuç gelmedi.";

    /// <summary>PayTR'ye gönderilen benzersiz sipariş no (harf/rakam, en fazla 64).</summary>
    public string MerchantOid { get; set; } = string.Empty;

    public CardPaymentPurpose Purpose { get; set; }

    public string RestaurantId { get; set; } = string.Empty;

    // --- Masa ödemesi ---
    public string? BillId { get; set; }
    public int? TableNo { get; set; }

    /// <summary>Kalem seçilerek ödendiyse kalemler; boşsa tutar ödemesidir.</summary>
    public List<string> ItemIds { get; set; } = [];

    // --- Abonelik ödemesi ---
    public SubscriptionPlan? Plan { get; set; }
    public int? BillingPeriodMonths { get; set; }

    /// <summary>Tahsil edilmesi istenen tutar (kuruş).</summary>
    public long AmountMinor { get; set; }

    public CardPaymentStatus Status { get; set; } = CardPaymentStatus.Pending;

    /// <summary>PayTR'nin bildirdiği tahsil edilen tutar (kuruş; taksit farkı dahil olabilir).</summary>
    public long? PaidTotalMinor { get; set; }

    public string? FailReason { get; set; }

    public DateTime? CompletedAt { get; set; }

    public bool TestMode { get; set; }

    /// <summary>Ödeme sonrası müşterinin döneceği uygulama içi yol (ör. /menu/...).</summary>
    public string ReturnPath { get; set; } = "/";

    // --- Restorana transfer (yalnızca masa ödemeleri) ---
    public CardPaymentTransferStatus TransferStatus { get; set; } = CardPaymentTransferStatus.NotApplicable;
    public long? SubmerchantAmountMinor { get; set; }
    public string? TransferTransId { get; set; }
    public string? TransferReference { get; set; }
    public string? TransferError { get; set; }
    public DateTime? TransferRequestedAt { get; set; }
}
