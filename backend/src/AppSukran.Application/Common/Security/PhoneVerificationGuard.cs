using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using Entity = AppSukran.Domain.Entities.PhoneVerification;

namespace AppSukran.Application.Common.Security;

/// <summary>
/// Kayıttan önce iletişim bilgisinin doğrulandığını kanıtlar. Kullanıcı WhatsApp
/// (telefon) ya da e-posta ile doğrulamış olabilir; jeton hangisine aitse o kabul edilir.
/// </summary>
public sealed class PhoneVerificationGuard(
    IUnitOfWork unitOfWork,
    IVerificationCodeService codeService,
    IWhatsAppService whatsAppService,
    IEmailService emailService) : IPhoneVerificationGuard
{
    public bool IsEnabled => whatsAppService.IsEnabled || emailService.IsEnabled;

    public async Task EnsureVerifiedAsync(
        string phone, string email, string? verificationTicket, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(verificationTicket))
        {
            throw new InvalidOperationException("Telefon numaranızı veya e-posta adresinizi doğrulamanız gerekiyor.");
        }

        var repository = unitOfWork.Repository<Entity>();
        var now = DateTime.UtcNow;

        // Jeton ancak kayıt formundaki numara ya da adrese aitse geçerlidir: başkasının
        // doğruladığı bir jetonla farklı bir iletişim bilgisiyle kayıt olunamaz.
        var targets = new[] { PhoneNumber.Normalize(phone), VerificationTarget.ForEmail(email) };

        foreach (var target in targets)
        {
            var verification = (await repository.FindAsync(record => record.Phone == target, cancellationToken))
                .OrderByDescending(record => record.CreatedAt)
                .FirstOrDefault();

            if (verification is not null
                && verification.IsTicketValid(now)
                && codeService.Verify(verificationTicket, verification.TicketHash!))
            {
                // Tek kullanımlık: aynı doğrulamayla ikinci hesap açılamasın.
                verification.TicketConsumed = true;
                await repository.ReplaceAsync(verification, cancellationToken);
                return;
            }
        }

        throw new InvalidOperationException(
            "Doğrulama geçersiz veya süresi dolmuş. Lütfen numaranızı veya e-posta adresinizi yeniden doğrulayın.");
    }
}
