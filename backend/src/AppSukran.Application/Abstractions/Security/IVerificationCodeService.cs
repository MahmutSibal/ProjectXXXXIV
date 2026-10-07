namespace AppSukran.Application.Abstractions.Security;

/// <summary>
/// Doğrulama kodu ve tek kullanımlık jeton üretimi/özetleme.
/// Kodlar kriptografik rastgelelikle üretilir; tahmin edilebilir olmamalıdır.
/// </summary>
public interface IVerificationCodeService
{
    /// <summary>6 haneli, baştaki sıfırlar korunan kod üretir.</summary>
    string GenerateNumericCode(int digits = 6);

    /// <summary>Kaydı tamamlamak için kullanılacak tek kullanımlık jeton.</summary>
    string GenerateTicket();

    /// <summary>Kod/jeton veritabanında düz metin tutulmaz; özeti saklanır.</summary>
    string Hash(string value);

    /// <summary>Zamanlama saldırılarına karşı sabit süreli karşılaştırma.</summary>
    bool Verify(string value, string expectedHash);
}
