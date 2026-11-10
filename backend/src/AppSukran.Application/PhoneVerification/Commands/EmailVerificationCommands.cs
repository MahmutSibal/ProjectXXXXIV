using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using MediatR;

namespace AppSukran.Application.PhoneVerification.Commands;

// WhatsApp'ı olmayan kullanıcılar için alternatif: kod e-postayla gönderilir.
// Kurallar (bekleme, deneme sınırı, tek kullanımlık jeton) WhatsApp ile aynıdır.

public sealed record SendEmailVerificationResult(string MaskedEmail, int ExpiresInSeconds, int ResendAfterSeconds);

public sealed record SendEmailVerificationCommand(string Email) : IRequest<SendEmailVerificationResult>;

public sealed record VerifyEmailCodeCommand(string Email, string Code) : IRequest<VerifyPhoneCodeResult>;

public sealed class SendEmailVerificationCommandHandler(
    IUnitOfWork unitOfWork,
    IEmailService emailService,
    IVerificationCodeService codeService,
    IPhoneVerificationPolicy policy)
    : IRequestHandler<SendEmailVerificationCommand, SendEmailVerificationResult>
{
    public async Task<SendEmailVerificationResult> Handle(
        SendEmailVerificationCommand request, CancellationToken cancellationToken)
    {
        var email = VerificationTarget.NormalizeEmail(request.Email);
        if (!VerificationTarget.IsPlausibleEmail(email))
        {
            throw new InvalidOperationException("Geçerli bir e-posta adresi girin.");
        }

        if (!emailService.IsEnabled)
        {
            throw new InvalidOperationException("E-posta ile doğrulama şu an kullanılamıyor.");
        }

        var lifetime = policy.EmailCodeLifetimeSeconds;
        var minutes = Math.Max(1, lifetime / 60);

        await VerificationCodeFlow.IssueAsync(
            unitOfWork, codeService, policy, VerificationTarget.ForEmail(email), lifetime,
            code => emailService.SendAsync(
                email,
                $"Şükran App doğrulama kodunuz: {code}",
                "Merhaba,\n\n" +
                $"Şükran App kaydınızı tamamlamak için doğrulama kodunuz: {code}\n\n" +
                $"Kod {minutes} dakika geçerlidir. Bu kodu kimseyle paylaşmayın.\n\n" +
                "Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.\n\n" +
                "Şükran App",
                cancellationToken),
            cancellationToken);

        return new SendEmailVerificationResult(
            VerificationTarget.MaskEmail(email), lifetime, policy.ResendCooldownSeconds);
    }
}

public sealed class VerifyEmailCodeCommandHandler(
    IUnitOfWork unitOfWork,
    IVerificationCodeService codeService,
    IPhoneVerificationPolicy policy)
    : IRequestHandler<VerifyEmailCodeCommand, VerifyPhoneCodeResult>
{
    public Task<VerifyPhoneCodeResult> Handle(VerifyEmailCodeCommand request, CancellationToken cancellationToken)
        => VerificationCodeFlow.VerifyAsync(
            unitOfWork, codeService, policy, VerificationTarget.ForEmail(request.Email), request.Code, cancellationToken);
}
