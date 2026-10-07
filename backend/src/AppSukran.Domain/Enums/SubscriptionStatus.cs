namespace AppSukran.Domain.Enums;

public enum SubscriptionStatus
{
    /// <summary>Deneme süresi devam ediyor.</summary>
    Trialing = 1,

    /// <summary>Ödemesi yapılmış, aktif abonelik.</summary>
    Active = 2,

    /// <summary>Ödeme gecikti; hizmet henüz kesilmedi (ödemesiz tolerans süresi).</summary>
    PastDue = 3,

    /// <summary>Süresi doldu veya ödenmedi; hizmet kısıtlandı.</summary>
    Expired = 4,

    /// <summary>İşletme tarafından iptal edildi.</summary>
    Cancelled = 5,
}
