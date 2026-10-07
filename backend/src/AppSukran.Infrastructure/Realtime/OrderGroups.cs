namespace AppSukran.Infrastructure.Realtime;

/// <summary>
/// SignalR grup adlarının tek kaynağı.
///
/// Grup adı, hub (kimin hangi gruba gireceği) ile yayıncı (kime gönderileceği)
/// arasındaki tek sözleşmedir. İki yerde ayrı ayrı yazılsaydı, birindeki bir
/// yazım değişikliği diğerini sessizce bozardı: kimse hata almaz, bildirimler
/// yalnızca hiç gelmez olurdu.
/// </summary>
internal static class OrderGroups
{
    /// <summary>Personel grubu: restoranın TÜM siparişlerini alır.</summary>
    public static string Restaurant(string restaurantId) => $"restaurant:{restaurantId}";

    /// <summary>
    /// Masa grubu: yalnızca o masanın siparişlerini alır.
    ///
    /// QR ile bağlanan müşteri buraya girer. Restoran geneli gruba alınsaydı,
    /// masadaki bir misafir bütün salonun sipariş akışını izleyebilirdi.
    /// </summary>
    public static string Table(string restaurantId, int tableNo) => $"restaurant:{restaurantId}:table:{tableNo}";
}
