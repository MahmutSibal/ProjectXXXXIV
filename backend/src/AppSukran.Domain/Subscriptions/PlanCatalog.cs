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
/// <param name="DiscountPercent">Kampanya indirimi (%); her dönemde liste fiyatına uygulanır.</param>
/// <param name="IsVisible">Kapalıysa satın alınamaz ve listelenmez (mevcut aboneler etkilenmez).</param>
/// <param name="IsHighlighted">Ana sayfada öne çıkarılır.</param>
/// <param name="Bullets">Paket kartındaki özellik maddeleri.</param>
public sealed record PlanDefinition(
    SubscriptionPlan Plan,
    string Code,
    string DisplayName,
    string Summary,
    long MonthlyPrice,
    bool IsQuoteOnly,
    bool AllowsTrial,
    PlanFeatures Features,
    int DiscountPercent = 0,
    bool IsVisible = true,
    bool IsHighlighted = false,
    IReadOnlyList<string>? Bullets = null)
{
    public IReadOnlyList<string> BulletList => Bullets ?? [];
}

/// <summary>
/// Seçilen paket ve dönem için hesaplanmış fiyat. Tahsil edilecek tutar
/// YALNIZCA burada üretilir; istemciden gelen fiyata asla güvenilmez.
/// </summary>
/// <param name="ListTotal">İndirimsiz toplam (aylık fiyat × ay sayısı).</param>
/// <param name="DiscountPercent">Toplam indirimin liste fiyatına oranı (kampanya + yıllık, yuvarlanmış).</param>
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

/// <summary>SuperAdmin'in yaptığı paket ayarlarının tamamı (veritabanından okunur).</summary>
public sealed record PlanCatalogSnapshot(
    IReadOnlyCollection<PlanDefinition> Plans,
    int AnnualDiscountPercent,
    int TrialDays,
    string PriceVersion);

/// <summary>
/// Paketlerin fiyat, kapsam ve limitleri — TEK DOĞRULUK KAYNAĞI.
///
/// Koddaki tanımlar VARSAYILANDIR. SuperAdmin panelinden yapılan değişiklikler veritabanında
/// tutulur ve <see cref="Apply"/> ile buraya yüklenir (uygulama açılışında, değişiklikten hemen
/// sonra ve diğer sunucular için düzenli aralıklarla). Böylece kilitler, fiyat hesabı, ödeme
/// tutarı ve paket listesi aynı anda güncellenir.
///
/// Tutarlar kuruş cinsindendir (190_000 = 1.900,00 TL). Frontend fiyat tutmaz;
/// paket kartlarındaki her değer bu katalogdan türetilip API ile gönderilir.
/// </summary>
public static class PlanCatalog
{
    /// <summary>Koddaki varsayılan fiyat listesinin sürümü.</summary>
    public const string DefaultPriceVersion = "2026-07";

    /// <summary>Varsayılan ücretsiz deneme süresi.</summary>
    public const int DefaultTrialDays = 14;

    /// <summary>Varsayılan yıllık ödeme indirimi (%).</summary>
    public const int DefaultAnnualDiscountPercent = 10;

    /// <summary>Yıllık sayılmak için gereken en az ay sayısı.</summary>
    public const int AnnualPeriodMonths = 12;

    public static readonly PlanDefinition DefaultTrial = new(
        SubscriptionPlan.Trial,
        "trial",
        "Ücretsiz Deneme",
        "Silver paketin özellikleriyle 14 gün ücretsiz.",
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

    public static readonly PlanDefinition DefaultLite = new(
        SubscriptionPlan.Lite,
        "lite",
        "Bronz",
        "QR menüyle hızlı bir başlangıç yapmak isteyen işletmeler için.",
        MonthlyPrice: 190_000,
        IsQuoteOnly: false,
        AllowsTrial: false,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: null,
            MaxKitchenPanels: 1,
            MaxWaiterPanels: 0,
            HasDetailedReports: false,
            HasEvents: false,
            MaxTables: null),
        Bullets: ["1 mutfak personeli hesabı", "1 işletme admin paneli", "Anlık sipariş takibi", "Dinamik QR menü", "Sipariş geçmişi", "Günlük kazanç takibi", "Kategori ve ürün yönetimi", "Masa ve QR kod yönetimi"]);

    public static readonly PlanDefinition DefaultPro = new(
        SubscriptionPlan.Pro,
        "pro",
        "Silver",
        "Sipariş sürecini dijitalleştirmek isteyen restoranlar için.",
        MonthlyPrice: 399_000,
        IsQuoteOnly: false,
        AllowsTrial: true,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: 1_000,
            MaxKitchenPanels: 1,
            MaxWaiterPanels: 1,
            HasDetailedReports: true,
            HasEvents: false,
            MaxTables: null),
        Bullets: ["Aylık 1.000 sipariş", "1 mutfak personeli hesabı", "1 işletme admin paneli", "QR menüden ödeme alma", "Anlık sipariş takibi", "Dinamik QR menü", "Sipariş geçmişi", "Günlük kazanç takibi", "Personel ve rol yönetimi", "Masa ve QR kod yönetimi", "Gelişmiş satış raporları", "Öncelikli teknik destek"]);

    public static readonly PlanDefinition DefaultBusiness = new(
        SubscriptionPlan.Business,
        "business",
        "Gold",
        "Tüm hizmetleri ve panelleri kullanmak isteyen işletmeler için.",
        MonthlyPrice: 799_000,
        IsQuoteOnly: false,
        AllowsTrial: false,
        new PlanFeatures(
            HasQrMenu: true,
            HasOrdering: true,
            MaxQrOrdersPerPeriod: 3_000,
            MaxKitchenPanels: 3,
            MaxWaiterPanels: null,
            HasDetailedReports: true,
            HasEvents: true,
            MaxTables: null),
        IsHighlighted: true,
        Bullets: ["Aylık 3.000 sipariş", "3 mutfak personeli hesabı", "1 işletme admin paneli", "QR menüden ödeme alma", "Etkinlik tablosu", "Sadakat programı", "Restoran yorumları", "Anlık sipariş takibi", "Dinamik QR menü", "Sipariş geçmişi", "Günlük kazanç takibi", "Gelişmiş performans raporları", "Personel ve yetki yönetimi", "Öncelikli teknik destek"]);

    public static readonly PlanDefinition DefaultEnterprise = new(
        SubscriptionPlan.Enterprise,
        "enterprise",
        "Kurumsal",
        "Çok şubeli ve özel entegrasyon ihtiyacı bulunan işletmeler için.",
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
            MaxTables: null),
        Bullets: ["İşletmeye özel sipariş limiti", "Çoklu şube yönetimi", "Özel mutfak hesapları", "Merkezi yönetim paneli", "Gelişmiş rol ve yetki sistemi", "Şubeler arası performans takibi", "İşletmeye özel raporlama", "Özel ödeme ve POS entegrasyonları", "Markaya özel QR menü tasarımı", "Özel API entegrasyonları", "Kurulum ve veri aktarım desteği", "7/24 öncelikli teknik destek"]);

    /// <summary>Koddaki varsayılan paketler (sıra: deneme, Lite, Pro, Business, Enterprise).</summary>
    public static IReadOnlyList<PlanDefinition> Defaults { get; } =
        [DefaultTrial, DefaultLite, DefaultPro, DefaultBusiness, DefaultEnterprise];

    private static readonly PlanCatalogSnapshot DefaultSnapshot =
        new(Defaults, DefaultAnnualDiscountPercent, DefaultTrialDays, DefaultPriceVersion);

    private static volatile PlanCatalogSnapshot current = DefaultSnapshot;

    /// <summary>
    /// Yeni ayarları yükler. Gelen listede olmayan paket için varsayılan kullanılır; paketin
    /// kimliği (kod, teklif usulü, deneme hakkı) değiştirilemez.
    /// </summary>
    public static void Apply(PlanCatalogSnapshot snapshot)
    {
        var byPlan = snapshot.Plans.ToDictionary(definition => definition.Plan);
        var merged = Defaults
            .Select(fallback => byPlan.TryGetValue(fallback.Plan, out var custom)
                ? custom with { Code = fallback.Code, IsQuoteOnly = fallback.IsQuoteOnly, AllowsTrial = fallback.AllowsTrial }
                : fallback)
            .ToList();

        current = new PlanCatalogSnapshot(
            merged,
            Math.Clamp(snapshot.AnnualDiscountPercent, 0, 90),
            Math.Clamp(snapshot.TrialDays, 0, 90),
            string.IsNullOrWhiteSpace(snapshot.PriceVersion) ? DefaultPriceVersion : snapshot.PriceVersion);
    }

    /// <summary>Varsayılanlara döner (testler için).</summary>
    public static void Reset() => current = DefaultSnapshot;

    /// <summary>Yürürlükteki fiyat listesinin sürümü; aboneliğe yazılır.</summary>
    public static string PriceVersion => current.PriceVersion;

    /// <summary>Ücretsiz deneme süresi (yalnızca deneme hakkı olan pakette).</summary>
    public static int TrialDays => current.TrialDays;

    /// <summary>Yıllık ödemede uygulanan ek indirim yüzdesi.</summary>
    public static int AnnualDiscountPercent => current.AnnualDiscountPercent;

    public static PlanDefinition Trial => Get(SubscriptionPlan.Trial);
    public static PlanDefinition Lite => Get(SubscriptionPlan.Lite);
    public static PlanDefinition Pro => Get(SubscriptionPlan.Pro);
    public static PlanDefinition Business => Get(SubscriptionPlan.Business);
    public static PlanDefinition Enterprise => Get(SubscriptionPlan.Enterprise);

    /// <summary>Deneme dahil tüm paketler.</summary>
    public static IReadOnlyCollection<PlanDefinition> All => current.Plans;

    /// <summary>Müşterinin satın alabileceği paketler (deneme ve gizlenmiş paketler hariç).</summary>
    public static IReadOnlyCollection<PlanDefinition> Purchasable =>
        current.Plans.Where(definition => definition.Plan != SubscriptionPlan.Trial && definition.IsVisible).ToList();

    public static PlanDefinition Get(SubscriptionPlan plan)
    {
        var snapshot = current;
        return snapshot.Plans.FirstOrDefault(definition => definition.Plan == plan)
            ?? snapshot.Plans.First(definition => definition.Plan == SubscriptionPlan.Trial);
    }

    /// <summary>
    /// Seçilen paket ve dönem için fiyatı hesaplar.
    ///
    /// Önce paketin kampanya indirimi, ardından yıllık (12+ ay) seçimde yıllık indirim uygulanır.
    /// Varsayılanlarla (kampanya yok, yıllık %10):
    ///   Lite     1.900 × 12 = 22.800 → 20.520 TL
    ///   Pro      3.990 × 12 = 47.880 → 43.092 TL
    ///   Business 7.990 × 12 = 95.880 → 86.292 TL
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Teklif usulü pakette (Enterprise) fiyat hesaplanamaz.
    /// </exception>
    public static PriceQuote Quote(SubscriptionPlan plan, int billingPeriodMonths)
    {
        var snapshot = current;
        var definition = snapshot.Plans.FirstOrDefault(candidate => candidate.Plan == plan) ?? Get(plan);

        if (definition.IsQuoteOnly)
        {
            throw new InvalidOperationException(
                $"{definition.DisplayName} paketi teklif usulüdür; otomatik fiyatlandırılamaz.");
        }

        var months = billingPeriodMonths < 1 ? 1 : billingPeriodMonths;
        var listTotal = definition.MonthlyPrice * months;

        // Kuruş cinsinden tam sayı aritmetiği: yüzde hesabında kuruş kaybı olmasın.
        var campaignPercent = Math.Clamp(definition.DiscountPercent, 0, 90);
        var afterCampaign = listTotal - (listTotal * campaignPercent / 100);

        var annualPercent = months >= AnnualPeriodMonths ? snapshot.AnnualDiscountPercent : 0;
        var total = afterCampaign - (afterCampaign * annualPercent / 100);

        var discountAmount = listTotal - total;
        var effectivePercent = listTotal == 0 ? 0 : (int)Math.Round(discountAmount * 100.0 / listTotal);

        return new PriceQuote(
            plan,
            months,
            listTotal,
            discountAmount,
            effectivePercent,
            total,
            snapshot.PriceVersion);
    }

    /// <summary>Tahsil edilecek tutar (kuruş). Ödeme akışında bu değer kullanılır.</summary>
    public static long PriceFor(SubscriptionPlan plan, int billingPeriodMonths)
        => Quote(plan, billingPeriodMonths).Total;
}
