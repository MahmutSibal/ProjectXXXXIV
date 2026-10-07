namespace AppSukran.Application.Abstractions.Maintenance;

/// <summary>
/// "Sunucu kapatma" bayrağının çok kısa süreli önbellekli okuması. Her API isteğinde
/// çalışan ara katman tarafından kullanılır; bu yüzden veritabanına her istekte gitmez.
/// </summary>
public interface IServerShutdownState
{
    /// <summary>
    /// Sunucu yazılımsal olarak kapalı mı? Hiçbir zaman hata fırlatmaz; okunamazsa
    /// <c>false</c> döner (fail-open) ve uyarı loglar.
    /// </summary>
    Task<bool> IsDisabledAsync(CancellationToken cancellationToken = default);

    /// <summary>Önbelleği hemen düşürür; ayar kaydedildiğinde çağrılır.</summary>
    void Invalidate();
}
