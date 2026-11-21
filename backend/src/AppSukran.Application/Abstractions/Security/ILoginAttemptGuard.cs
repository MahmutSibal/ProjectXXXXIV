namespace AppSukran.Application.Abstractions.Security;

/// <summary>
/// Şifre deneme koruması. Sayaç "e-posta + IP" başınadır: aynı restoranın Wi-Fi'ındaki
/// personel birbirini kilitlemez, başka bir cihazdan yapılan yanlış denemeler de gerçek
/// kullanıcının girişini engellemez.
/// </summary>
public interface ILoginAttemptGuard
{
    /// <summary>Bekleme süresi doluncaya kadar kalan süre; kilit yoksa null.</summary>
    TimeSpan? GetRemainingLockout(string email, string? ipAddress);

    void RegisterFailure(string email, string? ipAddress);

    void Reset(string email, string? ipAddress);
}
