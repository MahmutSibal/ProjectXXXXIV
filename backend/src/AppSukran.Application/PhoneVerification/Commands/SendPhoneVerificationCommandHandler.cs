using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using MediatR;

namespace AppSukran.Application.PhoneVerification.Commands;

public sealed class SendPhoneVerificationCommandHandler(
    IUnitOfWork unitOfWork,
    IWhatsAppService whatsAppService,
    IVerificationCodeService codeService,
    IPhoneVerificationPolicy policy)
    : IRequestHandler<SendPhoneVerificationCommand, SendPhoneVerificationResult>
{
    public async Task<SendPhoneVerificationResult> Handle(
        SendPhoneVerificationCommand request, CancellationToken cancellationToken)
    {
        var phone = PhoneNumber.Normalize(request.Phone);
        if (!PhoneNumber.IsPlausible(phone))
        {
            throw new InvalidOperationException("Geçerli bir telefon numarası girin.");
        }

        var minutes = Math.Max(1, policy.CodeLifetimeSeconds / 60);

        await VerificationCodeFlow.IssueAsync(
            unitOfWork, codeService, policy, phone, policy.CodeLifetimeSeconds,
            code => whatsAppService.SendMessageAsync(
                phone,
                $"Şükran App doğrulama kodunuz: {code}\n\n" +
                $"Kod {minutes} dakika geçerlidir. Bu isteği siz yapmadıysanız dikkate almayın.\n" +
                "Bu kodu kimseyle paylaşmayın.",
                cancellationToken),
            cancellationToken);

        return new SendPhoneVerificationResult(
            PhoneNumber.Mask(phone),
            policy.CodeLifetimeSeconds,
            policy.ResendCooldownSeconds);
    }
}

/// <summary>
/// Süre/limit ayarlarını Application katmanına taşır (Infrastructure'daki
/// ayar sınıflarına doğrudan bağımlılık kurmamak için).
/// </summary>
public interface IPhoneVerificationPolicy
{
    int CodeLifetimeSeconds { get; }
    int EmailCodeLifetimeSeconds { get; }
    int ResendCooldownSeconds { get; }
    int TicketLifetimeSeconds { get; }
}
