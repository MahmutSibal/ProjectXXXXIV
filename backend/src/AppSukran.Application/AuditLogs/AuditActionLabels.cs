namespace AppSukran.Application.AuditLogs;

/// <summary>
/// Teknik işlem kodlarını işletme sahibinin anlayacağı Türkçe ifadelere çevirir.
///
/// "İşlemler" ekranında "OrderStatusUpdated" gibi kodlar görünüyordu; işletme
/// sahibi için anlamsız. Çeviri sunucuda yapılır ki tüm istemciler aynı dili
/// kullansın ve yeni bir işlem türü eklendiğinde tek yerden güncellensin.
/// </summary>
public static class AuditActionLabels
{
    private static readonly Dictionary<string, string> Labels = new(StringComparer.OrdinalIgnoreCase)
    {
        // Sipariş
        ["OrderCreated"] = "Sipariş oluşturuldu",
        ["OrderStatusUpdated"] = "Sipariş durumu değişti",
        ["OrderItemStatusUpdated"] = "Ürün durumu değişti",
        ["OrderDeleted"] = "Sipariş silindi",

        // Adisyon
        ["BillCreated"] = "Adisyon açıldı",
        ["BillUpdated"] = "Adisyon güncellendi",
        ["BillItemStatusUpdated"] = "Adisyon ürünü güncellendi",
        ["BillDeleted"] = "Adisyon silindi",

        // Ödeme
        ["PaymentCompleted"] = "Ödeme alındı",
        ["PaymentSettleFailed"] = "Ödeme başarısız",

        // Abonelik
        ["TrialStarted"] = "Ücretsiz deneme başladı",
        ["SubscriptionPlanChanged"] = "Paket değiştirildi",
        ["SubscriptionExtended"] = "Abonelik yenilendi",
        ["SubscriptionCancelled"] = "Abonelik iptal edildi",

        // Masa
        ["TableSessionOpened"] = "Masa açıldı",
        ["TableSessionClosed"] = "Masa kapatıldı",

        // Kullanıcı / personel
        ["BusinessRegistered"] = "İşletme kaydı oluşturuldu",
        ["StaffCreated"] = "Personel eklendi",
        ["StaffDeleted"] = "Personel silindi",
        ["UserCreated"] = "Kullanıcı oluşturuldu",
        ["UserDeleted"] = "Kullanıcı silindi",
        ["UserRoleUpdated"] = "Kullanıcı yetkisi değişti",
        ["UserPasswordReset"] = "Şifre sıfırlandı",

        // Fatura
        ["BillingProfileUpdated"] = "Fatura bilgileri güncellendi",

        // Ödeme ayarları
        ["PlatformPaymentSettingsUpdated"] = "Havale/EFT ayarları güncellendi",
        ["PlatformPaymentOptionsUpdated"] = "Ödeme altyapısı ayarları güncellendi",
        ["RestaurantPaymentSettingsUpdated"] = "Online ödeme ayarları güncellendi",

        // Bakım modu
        ["MaintenanceModeEnabled"] = "Bakım modu açıldı",
        ["MaintenanceModeDisabled"] = "Bakım modu kapatıldı",
        ["ServerShutdownEnabled"] = "Sunucu kapatıldı",
        ["ServerShutdownDisabled"] = "Sunucu açıldı",
    };

    /// <summary>
    /// Kodun Türkçe karşılığı. Tanımsız bir kod gelirse kodun kendisi döner —
    /// böylece yeni bir işlem türü eklendiğinde kayıt kaybolmaz, yalnızca
    /// çevrilmemiş görünür.
    /// </summary>
    public static string For(string action)
        => Labels.TryGetValue(action, out var label) ? label : action;
}
