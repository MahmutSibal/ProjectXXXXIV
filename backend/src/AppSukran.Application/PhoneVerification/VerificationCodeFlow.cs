using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.PhoneVerification.Commands;
using Entity = AppSukran.Domain.Entities.PhoneVerification;

namespace AppSukran.Application.PhoneVerification;

/// <summary>
/// Kod üretme / doğrulama mantığı. WhatsApp ve e-posta aynı kuralları kullanır
/// (bekleme süresi, deneme sınırı, tek kullanımlık jeton); yalnızca kodun nasıl
/// iletildiği değişir.
/// </summary>
internal static class VerificationCodeFlow
{
    /// <param name="target">Normalize numara veya VerificationTarget.ForEmail(...).</param>
    /// <param name="deliver">Kodu kullanıcıya ileten adım. Hata fırlatırsa kayıt geri alınır.</param>
    public static async Task IssueAsync(
        IUnitOfWork unitOfWork,
        IVerificationCodeService codeService,
        IPhoneVerificationPolicy policy,
        string target,
        int codeLifetimeSeconds,
        Func<string, Task> deliver,
        CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<Entity>();
        var now = DateTime.UtcNow;

        var existing = (await repository.FindAsync(record => record.Phone == target, cancellationToken))
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
            Phone = target,
            CodeHash = codeService.Hash(code),
            ExpiresAt = now.AddSeconds(codeLifetimeSeconds),
        };

        await repository.InsertAsync(verification, cancellationToken);

        try
        {
            await deliver(code);
        }
        catch
        {
            // İleti gitmediyse kaydı bırakmıyoruz: aksi hâlde kullanıcı hiç kod almadığı
            // hâlde "yeniden gönder" bekleme süresine takılırdı.
            await repository.DeleteAsync(verification.Id, cancellationToken);
            throw;
        }
    }

    public static async Task<VerifyPhoneCodeResult> VerifyAsync(
        IUnitOfWork unitOfWork,
        IVerificationCodeService codeService,
        IPhoneVerificationPolicy policy,
        string target,
        string? submittedCode,
        CancellationToken cancellationToken)
    {
        var code = (submittedCode ?? string.Empty).Trim();
        var repository = unitOfWork.Repository<Entity>();
        var now = DateTime.UtcNow;

        var verification = (await repository.FindAsync(record => record.Phone == target, cancellationToken))
            .OrderByDescending(record => record.CreatedAt)
            .FirstOrDefault();

        // Hedef için hiç kod yoksa da "kod hatalı" denir: saldırgan hangi numara/adreslere
        // kod gönderildiğini bu uçtan öğrenememeli.
        if (verification is null || !verification.IsUsable(now))
        {
            throw new InvalidOperationException(
                verification is not null && verification.IsExpired(now)
                    ? "Kodun süresi doldu. Lütfen yeni kod isteyin."
                    : "Kod hatalı veya geçersiz. Lütfen yeni kod isteyin.");
        }

        if (!codeService.Verify(code, verification.CodeHash))
        {
            verification.AttemptCount += 1;
            await repository.ReplaceAsync(verification, cancellationToken);

            var remaining = Entity.MaxAttempts - verification.AttemptCount;
            throw new InvalidOperationException(remaining > 0
                ? $"Kod hatalı. Kalan deneme hakkı: {remaining}."
                : "Çok fazla hatalı deneme yapıldı. Lütfen yeni kod isteyin.");
        }

        var ticket = codeService.GenerateTicket();
        verification.VerifiedAt = now;
        verification.TicketHash = codeService.Hash(ticket);
        verification.TicketExpiresAt = now.AddSeconds(policy.TicketLifetimeSeconds);
        verification.TicketConsumed = false;

        await repository.ReplaceAsync(verification, cancellationToken);

        return new VerifyPhoneCodeResult(ticket, policy.TicketLifetimeSeconds);
    }
}
