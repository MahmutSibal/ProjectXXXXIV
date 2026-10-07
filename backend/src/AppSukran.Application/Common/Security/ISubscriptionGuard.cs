namespace AppSukran.Application.Common.Security;

/// <summary>
/// Aboneliği olmayan veya süresi dolmuş restoranların ücretli özellikleri
/// kullanmasını engeller. Okuma işlemleri serbest bırakılır (işletme kendi
/// verisine ve geçmişine her zaman erişebilmelidir); engellenen, yeni iş
/// yaratan yazma işlemleridir.
/// </summary>
public interface ISubscriptionGuard
{
    /// <summary>Restoranın geçerli bir aboneliği yoksa <see cref="SubscriptionRequiredException"/> fırlatır.</summary>
    Task EnsureActiveAsync(string restaurantId, CancellationToken cancellationToken = default);

    /// <summary>Paketin masa limitini aşıp aşmadığını denetler.</summary>
    Task EnsureCanAddTableAsync(string restaurantId, int currentTableCount, CancellationToken cancellationToken = default);

    /// <summary>Paketin ilgili özelliği içerip içermediğini denetler.</summary>
    Task EnsureFeatureAsync(string restaurantId, SubscriptionFeature feature, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sipariş oluşturulabilir mi? Hem paketin sipariş sistemi içerip içermediğini
    /// (Lite'ta yoktur) hem de dönem başına QR sipariş limitini denetler.
    /// </summary>
    Task EnsureCanCreateOrderAsync(string restaurantId, CancellationToken cancellationToken = default);
}

public enum SubscriptionFeature
{
    StaffPanels,
    DetailedReports,
    Events,

    /// <summary>Sipariş sistemi. Lite pakette kapalıdır.</summary>
    Ordering,
}

/// <summary>Abonelik gerektiren bir işlem, geçerli abonelik olmadan denendiğinde fırlatılır.</summary>
public sealed class SubscriptionRequiredException(string message) : Exception(message);
