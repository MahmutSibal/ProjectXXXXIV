using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

/// <summary>
/// SuperAdmin'in bir paket için yaptığı ayar (ad, fiyat, indirim, limitler, kart maddeleri).
/// Kimliği paket kodudur ("lite", "pro"...). Kayıt yoksa koddaki varsayılan tanım geçerlidir
/// (bkz. <see cref="Subscriptions.PlanCatalog"/>).
/// </summary>
public sealed class PlanSetting : AggregateRoot
{
    public SubscriptionPlan Plan { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    /// <summary>Aylık liste fiyatı (kuruş).</summary>
    public long MonthlyPrice { get; set; }

    /// <summary>Kampanya indirimi (%), her dönemde liste fiyatına uygulanır. 0 = indirim yok.</summary>
    public int DiscountPercent { get; set; }

    /// <summary>Kapalıysa paket satın alınamaz ve ana sayfada gösterilmez (mevcut aboneler etkilenmez).</summary>
    public bool IsVisible { get; set; } = true;

    /// <summary>Ana sayfada "En çok tercih edilen" olarak öne çıkarılır.</summary>
    public bool IsHighlighted { get; set; }

    /// <summary>Paket kartındaki özellik maddeleri; satır satır.</summary>
    public string Bullets { get; set; } = string.Empty;

    public bool HasOrdering { get; set; }

    public int? MaxQrOrdersPerPeriod { get; set; }

    public int? MaxKitchenPanels { get; set; }

    public int? MaxWaiterPanels { get; set; }

    public bool HasDetailedReports { get; set; }

    public bool HasEvents { get; set; }

    public int? MaxTables { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Paketlerin genel ayarları (tek satır, <see cref="SingletonId"/>).</summary>
public sealed class PlanCatalogSettings : AggregateRoot
{
    public const string SingletonId = "default";

    public PlanCatalogSettings()
    {
        Id = SingletonId;
    }

    /// <summary>Yıllık (12 ay) ödemede ek indirim (%).</summary>
    public int AnnualDiscountPercent { get; set; }

    /// <summary>Ücretsiz deneme süresi (gün).</summary>
    public int TrialDays { get; set; }

    /// <summary>Fiyat listesinin sürümü; her değişiklikte yenilenir ve aboneliğe yazılır.</summary>
    public string PriceVersion { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
