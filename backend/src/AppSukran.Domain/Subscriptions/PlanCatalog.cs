using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Subscriptions;

/// <summary>
/// Bir paketin neleri kapsadığı. Limitler burada tanımlanır ve uygulama
/// genelinde YALNIZCA buradan okunur.
/// </summary>
/// <param name="MaxQrOrdersPerPeriod">Dönem başına QR sipariş üst sınırı; null = sınırsız.</param>
/// <param name="MaxTables">Masa üst sınırı; null = sınırsız.</param>
public sealed record PlanFeatures(
    bool HasQrMenu,
    bool HasOrdering,
    int? MaxQrOrdersPerPeriod,
    int? MaxKitchenPanels,
    int? MaxWaiterPanels,
    bool HasDetailedReports,
    bool HasEvents,
    int? MaxTables)
{
    public bool HasStaffPanels => (MaxKitchenPanels is null or > 0) || (MaxWaiterPanels is null or > 0);
}

/// <param name="MonthlyPrice">Kuruş cinsinden aylık liste fiyatı. Teklif usulü paketlerde 0.</param>
/// <param name="IsQuoteOnly">Sabit fiyatı yoktur; müşteri iletişime yönlendirilir (Enterprise).</param>
/// <param name="AllowsTrial">Ücretsiz deneme yalnızca bu pakette sunulur.</param>
public sealed record PlanDefinition(
    SubscriptionPlan Plan,
    string Code,
    string DisplayName,
    string Summary,
    long MonthlyPrice,
    bool IsQuoteOnly,
    bool AllowsTrial,
    PlanFeatures Features);

/// <summary>
/// Seçilen paket ve dönem için hesaplanmış fiyat. Tahsil edilecek tutar
/// YALNIZCA burada üretilir; istemciden gelen fiyata asla güvenilmez.
/// </summary>
/// <param name="ListTotal">İndirimsiz toplam (aylık fiyat × ay sayısı).</param>
/// <param name="Total">Gerçekte tahsil edilecek tutar.</param>
/// <param name="PriceVersion">Bu tutarın hangi fiyat listesinden geldiği (kayıt/denetim için).</param>
public sealed record PriceQuote(
    SubscriptionPlan Plan,
    int BillingPeriodMonths,
    long ListTotal,
    long DiscountAmount,
    int DiscountPercent,
    long Total,
    string PriceVersion);

/// <summary>
/// Paketlerin fiyat, kapsam ve limitleri — TEK DOĞRULUK KAYNAĞI.
///
/// Tutarlar kuruş cinsindendir (190_000 = 1.900,00 TL). Frontend fiyat tutmaz;
/// paket kartlarındaki her değer bu katalogdan türetilip API ile gönderilir.
/// </summary>
public static class PlanCatalog
{
    /// <summary>
    /// Yürürlükteki fiyat listesinin sürümü. Fiyat değiştiğinde ARTIRILIR ve
    /// aboneliğe yazılır; böylece hangi kaydın hangi listeyle ücretlendirildiği
    /// sonradan izlenebilir.
    /// </summary>
    public const string PriceVersion = "2026-07";

    /// <summary>Ücretsiz deneme süresi (yalnızca Pro pakette).</summary>
    public const int TrialDays = 14;

    /// <summary>Yıllık ödemede uygulanan indirim yüzdesi.</summary>
    public const int AnnualDiscountPercent = 10;

    /// <summary>Yıllık sayılmak için gereken en az ay sayısı.</summary>
    public const int AnnualPeriodMonths = 12;

    public static readonly PlanDefinition Trial = new(
        SubscriptionPlan.Trial,
        "trial",
        "Ücretsiz Deneme",
        "Pro paketin tüm özellikleri, 14 gün ücretsiz.",
        MonthlyPrice: 0,
        IsQuoteOnly: false,
        AllowsTrial: false,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: 1_500,
            MaxKitchenPanels: 1,
            MaxWaiterPanels: 1,
            HasDetailedReports: true,
            HasEvents: true,
            MaxTables: null));

    public static readonly PlanDefinition Lite = new(
        SubscriptionPlan.Lite,
        "lite",
        "Lite",
        "Yalnızca QR menü. Sipariş sistemi bulunmaz.",
        MonthlyPrice: 190_000,
        IsQuoteOnly: false,
        AllowsTrial: false,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: false,
            MaxQrOrdersPerPeriod: 0,
            MaxKitchenPanels: 0,
            MaxWaiterPanels: 0,
            HasDetailedReports: false,
            HasEvents: false,
            MaxTables: null));

    public static readonly PlanDefinition Pro = new(
        SubscriptionPlan.Pro,
        "pro",
        "Pro",
        "Sipariş sistemi, 1 mutfak ve 1 garson paneli. 14 gün ücretsiz deneme.",
        MonthlyPrice: 399_000,
        IsQuoteOnly: false,
        AllowsTrial: true,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: 1_500,
            MaxKitchenPanels: 1,
            MaxWaiterPanels: 1,
            HasDetailedReports: true,
            HasEvents: true,
            MaxTables: null));

    public static readonly PlanDefinition Business = new(
        SubscriptionPlan.Business,
        "business",
        "Business",
        "Tüm paneller ve hizmetler dahil.",
        MonthlyPrice: 799_000,
        IsQuoteOnly: false,
        AllowsTrial: false,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: 5_000,
            MaxKitchenPanels: null,
            MaxWaiterPanels: null,
            HasDetailedReports: true,
            HasEvents: true,
            MaxTables: null));

    public static readonly PlanDefinition Enterprise = new(
        SubscriptionPlan.Enterprise,
        "enterprise",
        "Enterprise",
        "Kurumsal ihtiyaçlar, özel limitler ve entegrasyonlar. Teklif usulü.",
        MonthlyPrice: 0,
        IsQuoteOnly: true,
        AllowsTrial: false,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: null,
            MaxKitchenPanels: null,
            MaxWaiterPanels: null,
            HasDetailedReports: true,
            HasEvents: true,
            MaxTables: null));

    /// <summary>Deneme dahil tüm paketler.</summary>
    public static IReadOnlyCollection<PlanDefinition> All { get; } =
        [Trial, Lite, Pro, Business, Enterprise];

    /// <summary>Müşterinin satın alabileceği paketler (deneme satılamaz).</summary>
    public static IReadOnlyCollection<PlanDefinition> Purchasable { get; } =
        [Lite, Pro, Business, Enterprise];

    public static PlanDefinition Get(SubscriptionPlan plan) => plan switch
    {
        SubscriptionPlan.Lite => Lite,
        SubscriptionPlan.Pro => Pro,
        SubscriptionPlan.Business => Business,
        SubscriptionPlan.Enterprise => Enterprise,
        _ => Trial,
    };

    /// <summary>
    /// Seçilen paket ve dönem için fiyatı hesaplar.
    ///
    /// Yıllık (12+ ay) seçimde liste tutarına %10 indirim uygulanır:
    ///   Lite     1.900 × 12 = 22.800 → 20.520 TL
    ///   Pro      3.990 × 12 = 47.880 → 43.092 TL
    ///   Business 7.990 × 12 = 95.880 → 86.292 TL
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Teklif usulü pakette (Enterprise) fiyat hesaplanamaz.
    /// </exception>
    public static PriceQuote Quote(SubscriptionPlan plan, int billingPeriodMonths)
    {
        var definition = Get(plan);

        if (definition.IsQuoteOnly)
        {
            throw new InvalidOperationException(
                $"{definition.DisplayName} paketi teklif usulüdür; otomatik fiyatlandırılamaz.");
        }

        var months = billingPeriodMonths < 1 ? 1 : billingPeriodMonths;
        var listTotal = definition.MonthlyPrice * months;

        var isAnnual = months >= AnnualPeriodMonths;
        var discountPercent = isAnnual ? AnnualDiscountPercent : 0;

        // Kuruş cinsinden tam sayı aritmetiği: yüzde hesabında kuruş kaybı olmasın.
        var discountAmount = listTotal * discountPercent / 100;

        return new PriceQuote(
            plan,
            months,
            listTotal,
            discountAmount,
            discountPercent,
            listTotal - discountAmount,
            PriceVersion);
    }

    /// <summary>Tahsil edilecek tutar (kuruş). Ödeme akışında bu değer kullanılır.</summary>
    public static long PriceFor(SubscriptionPlan plan, int billingPeriodMonths)
        => Quote(plan, billingPeriodMonths).Total;
}
