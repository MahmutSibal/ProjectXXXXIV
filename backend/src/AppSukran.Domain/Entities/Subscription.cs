using AppSukran.Domain.Common;
using AppSukran.Domain.Enums;

namespace AppSukran.Domain.Entities;

/// <summary>
/// Bir restoranın abonelik kaydı. Her restoranın en fazla bir aktif aboneliği olur.
/// Tutarlar kuruş (minor unit) cinsindendir — sistemin geri kalanıyla aynı.
/// </summary>
public sealed class Subscription : AggregateRoot
{
    public string RestaurantId { get; set; } = string.Empty;

    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Trial;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trialing;

    /// <summary>Mevcut dönemin başlangıcı.</summary>
    public DateTime CurrentPeriodStart { get; set; } = DateTime.UtcNow;

    /// <summary>Mevcut dönemin bitişi. Bu tarih geçtiğinde abonelik yenilenmeli veya süresi dolmuş sayılır.</summary>
    public DateTime CurrentPeriodEnd { get; set; }

    /// <summary>Deneme süresinin bitişi (yalnızca Trial için doludur).</summary>
    public DateTime? TrialEndsAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    /// <summary>Dönemsel ücret (kuruş). Ücretsiz denemede 0'dır.</summary>
    public long PricePerPeriod { get; set; }

    /// <summary>Faturalama dönemi ay cinsinden (1 = aylık, 12 = yıllık).</summary>
    public int BillingPeriodMonths { get; set; } = 1;

    /// <summary>
    /// Bu aboneliğin hangi fiyat listesiyle ücretlendirildiği (PlanCatalog.PriceVersion).
    /// Fiyatlar değiştiğinde eski aboneliklerin hangi tarifeden geldiği izlenebilsin diye
    /// saklanır; tutarın kendisi PricePerPeriod'da zaten donmuş durumdadır.
    /// </summary>
    public string PriceVersion { get; set; } = string.Empty;

    /// <summary>Son başarılı ödemenin tarihi.</summary>
    public DateTime? LastPaymentAt { get; set; }

    /// <summary>Son tahsilat denemesinin tarihi (başarılı ya da başarısız).</summary>
    public DateTime? LastPaymentAttemptAt { get; set; }

    /// <summary>
    /// Üst üste başarısız tahsilat sayısı. Başarılı ödemede sıfırlanır.
    /// Hatırlatma ve yeniden deneme kararları buna bakar.
    /// </summary>
    public int PaymentFailureCount { get; set; }

    /// <summary>Son tahsilat hatasının kullanıcıya gösterilebilir açıklaması.</summary>
    public string? LastPaymentError { get; set; }

    /// <summary>
    /// Yenileme hatırlatması hangi dönem sonu için gönderildi. Aynı dönem için ikinci kez
    /// gönderilmesin diye tutulur (dönem uzayınca yeni hatırlatma gider).
    /// </summary>
    public DateTime? RenewalReminderSentFor { get; set; }

    public List<SubscriptionPayment> Payments { get; set; } = [];

    /// <summary>
    /// Ödeme alınamadığında hizmetin açık kalmaya devam ettiği ek süre (gün).
    /// İş kararı: tahsilat başarısız olsa bile işletme bir ay daha çalışmaya devam eder,
    /// bu sürede durum "Ödeme Bekleniyor" olarak izlenir.
    ///
    /// TİCARİ RİSK: bu süre boyunca hizmet bedelsiz verilir. Süre sonunda erişim
    /// otomatik kesilir (SubscriptionExpiryWorker).
    /// </summary>
    public const int PastDueGraceDays = 30;

    /// <summary>
    /// Aboneliğin bugün itibarıyla hizmete erişim hakkı verip vermediği.
    ///
    /// - Trialing / Active : dönem sonuna kadar
    /// - PastDue           : dönem sonu + <see cref="PastDueGraceDays"/> gün (ödeme bekleniyor)
    /// - Cancelled         : ÖDENMİŞ dönem sonuna kadar (müşteri parasını ödedi;
    ///                       iptal yalnızca sonraki yenilemeyi durdurur)
    /// - Expired           : erişim yok
    /// </summary>
    public bool GrantsAccess(DateTime utcNow) => Status switch
    {
        SubscriptionStatus.Trialing or SubscriptionStatus.Active => CurrentPeriodEnd > utcNow,
        SubscriptionStatus.PastDue => CurrentPeriodEnd.AddDays(PastDueGraceDays) > utcNow,
        SubscriptionStatus.Cancelled => CurrentPeriodEnd > utcNow,
        _ => false,
    };

    /// <summary>İptal edildi ama ödenmiş dönemi henüz bitmedi.</summary>
    public bool IsCancelledButStillActive(DateTime utcNow) =>
        Status == SubscriptionStatus.Cancelled && CurrentPeriodEnd > utcNow;

    /// <summary>Ödeme bekleniyor; ek süre bitmeden erişim kesilmez.</summary>
    public DateTime? GraceEndsAt =>
        Status == SubscriptionStatus.PastDue ? CurrentPeriodEnd.AddDays(PastDueGraceDays) : null;

    /// <summary>Başarılı tahsilat sonrası hata izlerini temizler.</summary>
    public void MarkPaymentSucceeded(DateTime utcNow)
    {
        LastPaymentAt = utcNow;
        LastPaymentAttemptAt = utcNow;
        PaymentFailureCount = 0;
        LastPaymentError = null;
    }

    /// <summary>Başarısız tahsilatı kaydeder; erişim ek süre boyunca sürer.</summary>
    public void MarkPaymentFailed(DateTime utcNow, string error)
    {
        LastPaymentAttemptAt = utcNow;
        PaymentFailureCount += 1;
        LastPaymentError = error;
    }
}

/// <summary>Aboneliğe ait tek bir ödeme kaydı.</summary>
public sealed class SubscriptionPayment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>Ödenen tutar (kuruş).</summary>
    public long Amount { get; set; }

    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    /// <summary>Ödeme sağlayıcısındaki işlem referansı.</summary>
    public string? TransactionId { get; set; }

    /// <summary>Sağlayıcı adı ("Fake" vb.) veya elle kaydedilen ödemeler için "Manual".</summary>
    public string Provider { get; set; } = "Manual";

    /// <summary>Ödemenin yapıldığı andaki fiyat listesi sürümü.</summary>
    public string PriceVersion { get; set; } = string.Empty;

    /// <summary>Bu ödemenin karşılığı olan dönemin bitişi.</summary>
    public DateTime PeriodEnd { get; set; }
}
