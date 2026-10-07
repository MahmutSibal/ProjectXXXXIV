using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Common;
using MediatR;
using Entity = AppSukran.Domain.Entities.PhoneVerification;

namespace AppSukran.Application.PhoneVerification.Commands;

public sealed class VerifyPhoneCodeCommandHandler(
    IUnitOfWork unitOfWork,
    IVerificationCodeService codeService,
    IPhoneVerificationPolicy policy)
    : IRequestHandler<VerifyPhoneCodeCommand, VerifyPhoneCodeResult>
{
    public async Task<VerifyPhoneCodeResult> Handle(
        VerifyPhoneCodeCommand request, CancellationToken cancellationToken)
    {
        var phone = PhoneNumber.Normalize(request.Phone);
        var code = (request.Code ?? string.Empty).Trim();

        var repository = unitOfWork.Repository<Entity>();
        var now = DateTime.UtcNow;

        var verification = (await repository.FindAsync(record => record.Phone == phone, cancellationToken))
            .OrderByDescending(record => record.CreatedAt)
            .FirstOrDefault();

        // Numara için hiç kod yoksa da "kod hatalı" denir: saldırgan hangi numaralara
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
