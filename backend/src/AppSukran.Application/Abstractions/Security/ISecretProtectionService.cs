namespace AppSukran.Application.Abstractions.Security;

/// <summary>
/// Geri açılabilir sır şifreleme (ör. işletmenin iyzico anahtarları).
/// Kart numarası hash'inden farklı olarak değer sonradan okunabilmelidir.
/// </summary>
public interface ISecretProtectionService
{
    string Protect(string plainText);

    /// <exception cref="System.Security.Cryptography.CryptographicException">
    /// Değer bozuksa veya şifreleme anahtarı (JWT anahtarı) değiştiyse.
    /// </exception>
    string Unprotect(string protectedValue);
}
