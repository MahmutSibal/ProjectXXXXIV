namespace AppSukran.Application.Common.Security;

/// Çapraz-restoran (cross-tenant) erişimi engelleyen yetki guard'ı.
/// Orders/Bills gibi restorana bağlı kaynaklarda, çağıran kullanıcının kendi
/// restoranı dışındaki veriye erişmesini/değiştirmesini önler.
public interface IRestaurantAccessGuard
{
    /// SuperAdmin her restorana erişebilir. Diğer roller yalnızca kendi
    /// restoranlarına (token'daki `restaurantId` claim'i) erişebilir.
    /// Erişim yoksa <see cref="UnauthorizedAccessException"/> fırlatır.
    void EnsureCanAccess(string? restaurantId);
}
