namespace AppSukran.Application.Abstractions.Security;

/// <summary>
/// Kayıt sırasında telefonun gerçekten doğrulandığını kanıtlar.
/// Doğrulama kapalıysa geçiş serbesttir (yerel geliştirme).
/// </summary>
public interface IPhoneVerificationGuard
{
    bool IsEnabled { get; }

    /// <summary>
    /// Jetonu tüketir. Geçersizse hata fırlatır. Tek kullanımlıktır: aynı jetonla
    /// ikinci bir hesap açılamaz.
    /// </summary>
    /// <param name="phone">WhatsApp ile doğrulandıysa bu numara aranır.</param>
    /// <param name="email">E-posta ile doğrulandıysa bu adres aranır.</param>
    Task EnsureVerifiedAsync(string phone, string email, string? verificationTicket, CancellationToken cancellationToken = default);
}
