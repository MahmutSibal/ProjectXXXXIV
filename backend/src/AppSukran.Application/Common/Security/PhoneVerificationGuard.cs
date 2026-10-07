using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using Entity = AppSukran.Domain.Entities.PhoneVerification;

namespace AppSukran.Application.Common.Security;

public sealed class PhoneVerificationGuard(
    IUnitOfWork unitOfWork,
    IVerificationCodeService codeService,
    IWhatsAppService whatsAppService) : IPhoneVerificationGuard
{
    public bool IsEnabled => whatsAppService.IsEnabled;

    public async Task EnsureVerifiedAsync(
        string phone, string? verificationTicket, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(verificationTicket))
        {
            throw new InvalidOperationException("Telefon numaranızı doğrulamanız gerekiyor.");
        }

        var normalized = PhoneNumber.Normalize(phone);
        var repository = unitOfWork.Repository<Entity>();
        var now = DateTime.UtcNow;

        var verification = (await repository.FindAsync(record => record.Phone == normalized, cancellationToken))
            .OrderByDescending(record => record.CreatedAt)
            .FirstOrDefault();

        if (verification is null
            || !verification.IsTicketValid(now)
            || !codeService.Verify(verificationTicket, verification.TicketHash!))
        {
            throw new InvalidOperationException(
                "Telefon doğrulaması geçersiz veya süresi dolmuş. Lütfen numaranızı yeniden doğrulayın.");
        }

        // Tek kullanımlık: aynı doğrulamayla ikinci hesap açılamasın.
        verification.TicketConsumed = true;
        await repository.ReplaceAsync(verification, cancellationToken);
    }
}
