namespace AppSukran.Domain.Enums;

public enum CardPaymentPurpose
{
    TableBill = 1,
    Subscription = 2,
}

public enum CardPaymentStatus
{
    Pending = 1,
    Succeeded = 2,
    Failed = 3,
}

public enum CardPaymentTransferStatus
{
    /// <summary>Transfer gerekmez (abonelik ödemesi, başarısız ödeme).</summary>
    NotApplicable = 0,

    /// <summary>Ertesi sabah restorana gönderilecek.</summary>
    Pending = 1,

    /// <summary>PayTR'ye talimat verildi.</summary>
    Requested = 2,

    /// <summary>Talimat reddedildi veya bilgi eksik; Süper Admin bakmalı.</summary>
    Failed = 3,
}
