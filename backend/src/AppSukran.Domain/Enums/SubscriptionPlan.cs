namespace AppSukran.Domain.Enums;

/// <summary>
/// Abonelik paketleri.
///
/// DİKKAT: Sayısal değerler veritabanında saklanır, DEĞİŞTİRİLEMEZ.
/// 2 ve 3 eskiden Starter/Standard idi; paket adları Lite/Pro olarak yenilendi
/// ancak aynı kademeye karşılık geldikleri için sayısal değerler korundu.
/// </summary>
public enum SubscriptionPlan
{
    /// <summary>Ücretsiz deneme — Pro paket özellikleriyle, 14 gün. Yalnızca Pro'ya geçişte sunulur.</summary>
    Trial = 1,

    /// <summary>Lite: yalnızca QR menü. Sipariş sistemi ve paneller YOKTUR.</summary>
    Lite = 2,

    /// <summary>Pro: sipariş sistemi, 1 mutfak + 1 garson paneli, dönem başına 1.500 QR sipariş.</summary>
    Pro = 3,

    /// <summary>Business: tüm paneller ve hizmetler, dönem başına 5.000 QR sipariş.</summary>
    Business = 4,

    /// <summary>Enterprise: sabit fiyat yoktur, teklif usulü ilerler.</summary>
    Enterprise = 5,
}
