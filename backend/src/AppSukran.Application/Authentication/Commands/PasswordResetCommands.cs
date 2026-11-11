using AppSukran.Application.Abstractions.Notifications;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

// "Şifremi unuttum":
//  1) Kullanıcı e-postasını girer. Aktif hesap varsa 30 dk geçerli, tek kullanımlık bir
//     bağlantı e-postayla gönderilir. Hesap olsun olmasın AYNI yanıt döner: böylece bu uçtan
//     hangi e-postaların kayıtlı olduğu öğrenilemez.
//  2) Bağlantıdaki anahtarla yeni şifre belirlenir; anahtar geçersizleşir, tüm oturumlar kapanır.

public sealed record RequestPasswordResetCommand(string Email) : IRequest<Unit>;

public sealed record ResetPasswordCommand(string Token, string NewPassword) : IRequest<Unit>;

public sealed class RequestPasswordResetCommandValidator : AbstractValidator<RequestPasswordResetCommand>
{
    public RequestPasswordResetCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.").MaximumLength(200);
    }
}

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Yeni şifre en az 8 karakter olmalı.")
            .MinimumLength(8).WithMessage("Yeni şifre en az 8 karakter olmalı.")
            .MaximumLength(200).WithMessage("Yeni şifre en fazla 200 karakter olabilir.");
    }
}

public sealed class RequestPasswordResetCommandHandler(
    IUnitOfWork unitOfWork,
    IEmailService emailService,
    IVerificationCodeService codeService) : IRequestHandler<RequestPasswordResetCommand, Unit>
{
    public async Task<Unit> Handle(RequestPasswordResetCommand request, CancellationToken cancellationToken)
    {
        if (!emailService.IsEnabled)
        {
            throw new InvalidOperationException("Şifre sıfırlama şu anda kullanılamıyor. Lütfen destek ile iletişime geçin.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await unitOfWork.Repository<User>()
            .FirstOrDefaultAsync(candidate => candidate.Email == email && candidate.IsActive, cancellationToken);

        // Hesap yoksa da sessizce "gönderildi" denir (e-posta varlığı sızdırılmaz).
        if (user is null)
        {
            return Unit.Value;
        }

        var tokens = unitOfWork.Repository<PasswordResetToken>();
        var now = DateTime.UtcNow;

        // Önceki kullanılmamış bağlantılar geçersizleşir: yalnızca en son gönderilen çalışır.
        foreach (var old in await tokens.FindAsync(t => t.UserId == user.Id && t.UsedAt == null, cancellationToken))
        {
            old.UsedAt = now;
            await tokens.ReplaceAsync(old, cancellationToken);
        }

        var token = codeService.GenerateTicket();
        await tokens.InsertAsync(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = codeService.Hash(token),
            ExpiresAt = now.AddMinutes(PasswordResetToken.LifetimeMinutes),
        }, cancellationToken);

        var link = $"{emailService.AppBaseUrl}/sifre-sifirla?token={Uri.EscapeDataString(token)}";
        await emailService.SendAsync(user.Email, "Şükran App şifre sıfırlama",
            $"Merhaba {user.Name},\n\n" +
            "Şükran App hesabınız için şifre sıfırlama talebi aldık. Yeni şifrenizi belirlemek için " +
            $"aşağıdaki bağlantıya tıklayın:\n\n{link}\n\n" +
            $"Bağlantı {PasswordResetToken.LifetimeMinutes} dakika geçerlidir ve yalnızca bir kez kullanılabilir.\n\n" +
            "Bu talebi siz yapmadıysanız bu e-postayı dikkate almayın; şifreniz değişmez.\n\n" +
            "Şükran App",
            cancellationToken);

        return Unit.Value;
    }
}

public sealed class ResetPasswordCommandHandler(
    IUnitOfWork unitOfWork,
    IVerificationCodeService codeService,
    IPasswordHashingService passwordHashingService) : IRequestHandler<ResetPasswordCommand, Unit>
{
    public async Task<Unit> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var tokens = unitOfWork.Repository<PasswordResetToken>();
        var hash = codeService.Hash(request.Token.Trim());
        var now = DateTime.UtcNow;

        var resetToken = await tokens.FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);
        if (resetToken is null || !resetToken.IsUsable(now))
        {
            throw new InvalidOperationException("Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden şifre sıfırlama isteyin.");
        }

        var users = unitOfWork.Repository<User>();
        var user = await users.GetByIdAsync(resetToken.UserId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            throw new InvalidOperationException("Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden şifre sıfırlama isteyin.");
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            user.PasswordHash = passwordHashingService.HashPassword(request.NewPassword);
            await users.ReplaceAsync(user, cancellationToken);

            resetToken.UsedAt = now;
            await tokens.ReplaceAsync(resetToken, cancellationToken);

            // Şifre sıfırlanınca tüm cihazlardaki oturumlar kapanır (hesap ele geçirildiyse
            // saldırgan da dışarıda kalsın).
            var refreshTokens = unitOfWork.Repository<RefreshToken>();
            foreach (var session in await refreshTokens.FindAsync(t => t.UserId == user.Id && t.RevokedAt == null, cancellationToken))
            {
                session.RevokedAt = now;
                await refreshTokens.ReplaceAsync(session, cancellationToken);
            }

            await unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        return Unit.Value;
    }
}
