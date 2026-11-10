using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

/// <summary>
/// QR menüden masadaki müşterinin açtığı iade talebi. İşletme sahibi ve mutfak ekranına
/// canlı düşer; personel sonuçlandırır.
///
/// Bu kayıt parayı KENDİSİ iade etmez. Nakit iadeyi personel elden yapar; kart iadesi
/// ödeme sağlayıcısı (PayTR) entegrasyonuyla, IBAN iadesi işletmenin havalesiyle yapılır.
/// </summary>
public sealed class RefundRequest : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;
    public int TableNo { get; set; }

    /// <summary>Talebin açıldığı masa oturumu; aynı masaya sonradan oturanların talepleri karışmasın.</summary>
    public string TableSessionId { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;
    public RefundMethod Method { get; set; }

    /// <summary>Yalnızca IBAN ile iadede: müşterinin IBAN'ı ve hesap sahibinin adı.</summary>
    public string? Iban { get; set; }
    public string? AccountHolderName { get; set; }

    public RefundRequestStatus Status { get; set; } = RefundRequestStatus.Pending;
    public string? ResolutionNote { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedByUserId { get; set; }
}
