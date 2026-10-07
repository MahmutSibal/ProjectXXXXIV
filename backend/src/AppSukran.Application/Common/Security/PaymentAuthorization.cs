using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Security;

/// <summary>
/// Ödeme akışındaki yetki kuralları.
/// </summary>
public static class PaymentAuthorization
{
    /// <summary>
    /// Kart bilgisi OLMADAN adisyon kapatma yetkisi.
    ///
    /// Personel için meşrudur: müşteri nakit ödediğinde garson bunu sisteme işler.
    /// QR ile masadan bağlanan MÜŞTERİ için değildir — aksi hâlde QR bağlantısına
    /// erişen herkes adisyonu hiç ödeme yapmadan kapatabilir.
    /// </summary>
    public static void EnsureCanSettleWithoutCharge(ICurrentUserService currentUserService)
    {
        var isStaff =
            currentUserService.IsInRole(nameof(UserRole.SuperAdmin)) ||
            currentUserService.IsInRole(nameof(UserRole.RestaurantOwner)) ||
            currentUserService.IsInRole(nameof(UserRole.Waiter)) ||
            currentUserService.IsInRole(nameof(UserRole.Kitchen));

        if (!isStaff)
        {
            throw new InvalidOperationException(
                "Ödeme için kart bilgisi gerekli. Nakit ödemek istiyorsanız lütfen personele bildirin.");
        }
    }
}
