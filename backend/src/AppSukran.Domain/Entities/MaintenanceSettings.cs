using AppSukran.Domain.Common;

namespace AppSukran.Domain.Entities;

/// <summary>
/// Platform bakım modu duyurusu. Tek satırlık singleton kayıttır (<see cref="SingletonId"/>).
/// <see cref="IsEnabled"/> yalnızca bir DUYURUDUR (arayüz gösterir, sunucu engellemez).
/// <see cref="ServerDisabled"/> ise yazılımsal kapatmadır. Gizli değer içermez; herkese açık endpoint'ten okunur.
/// </summary>
public sealed class MaintenanceSettings : AggregateRoot
{
    public const string SingletonId = "default";

    public MaintenanceSettings()
    {
        Id = SingletonId;
    }

    /// <summary>Bakım duyurusu açık mı?</summary>
    public bool IsEnabled { get; set; }

    /// <summary>Kullanıcıya gösterilecek duyuru metni (en fazla 300 karakter).</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Yazılımsal sunucu kapatma: açıkken SuperAdmin dışındaki herkesin API isteği 503 döner
    /// (sağlık, giriş/yenileme/çıkış ve durum uçları hariç). Süreci durdurmaz.
    /// </summary>
    public bool ServerDisabled { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
