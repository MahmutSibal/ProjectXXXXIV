using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using MediatR;
using Entity = AppSukran.Domain.Entities.PhoneVerification;

namespace AppSukran.Application.PhoneVerification.Commands;

public sealed class SendPhoneVerificationCommandHandler(
    IUnitOfWork unitOfWork,
    IWhatsAppService whatsAppService,
    IVerificationCodeService codeService,
    IPhoneVerificationPolicy policy,
    ICurrentUserService currentUserService)
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

        var repository = unitOfWork.Repository<Entity>();
        var now = DateTime.UtcNow;

        // Aynı numara için en son kayıt: hem tekrar gönderim bekleme süresi hem de
        // eski kaydın üzerine yazma burada yönetilir.
        var existing = (await repository.FindAsync(record => record.Phone == phone, cancellationToken))
            .OrderByDescending(record => record.CreatedAt)
            .FirstOrDefault();

        if (existing is not null)
        {
            var elapsed = (now - existing.CreatedAt).TotalSeconds;
            if (elapsed < policy.ResendCooldownSeconds && existing.VerifiedAt is null)
            {
                var wait = (int)Math.Ceiling(policy.ResendCooldownSeconds - elapsed);
                throw new InvalidOperationException($"Yeni kod istemek için {wait} saniye bekleyin.");
            }
        }

        var code = codeService.GenerateNumericCode();

        var verification = new Entity
        {
            Phone = phone,
            CodeHash = codeService.Hash(code),
            ExpiresAt = now.AddSeconds(policy.CodeLifetimeSeconds),
        };

        await repository.InsertAsync(verification, cancellationToken);

        var minutes = Math.Max(1, policy.CodeLifetimeSeconds / 60);
        try
        {
            await whatsAppService.SendMessageAsync(
                phone,
                $"Şükran App doğrulama kodunuz: {code}\n\n" +
                $"Kod {minutes} dakika geçerlidir. Bu isteği siz yapmadıysanız dikkate almayın.\n" +
                "Bu kodu kimseyle paylaşmayın.",
                cancellationToken);
        }
        catch
        {
            // Mesaj gitmediyse kaydı bırakmıyoruz: aksi hâlde kullanıcı hiç kod almadığı
            // hâlde "yeniden gönder" bekleme süresine takılırdı.
            await repository.DeleteAsync(verification.Id, cancellationToken);
            throw;
        }

        return new SendPhoneVerificationResult(
            PhoneNumber.Mask(phone),
            policy.CodeLifetimeSeconds,
            policy.ResendCooldownSeconds);
    }
}

/// <summary>
/// Süre/limit ayarlarını Application katmanına taşır (Infrastructure'daki
/// WhatsAppSettings'e doğrudan bağımlılık kurmamak için).
/// </summary>
public interface IPhoneVerificationPolicy
{
    int CodeLifetimeSeconds { get; }
    int ResendCooldownSeconds { get; }
    int TicketLifetimeSeconds { get; }
}
