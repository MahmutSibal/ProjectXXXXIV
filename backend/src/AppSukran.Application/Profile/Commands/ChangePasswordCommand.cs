using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Profile.Commands;

/// <summary>Oturum açmış kullanıcı kendi şifresini değiştirir; mevcut şifre doğrulanır.</summary>
public sealed record ChangePasswordCommand(string CurrentPassword, string NewPassword) : IRequest<Unit>;

public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Mevcut şifrenizi girin.");
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(200)
            .WithMessage("Yeni şifre en az 8 karakter olmalı.");
        RuleFor(x => x.NewPassword).NotEqual(x => x.CurrentPassword)
            .WithMessage("Yeni şifre mevcut şifreyle aynı olamaz.");
    }
}

public sealed class ChangePasswordCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    IPasswordHashingService passwordHashingService) : IRequestHandler<ChangePasswordCommand, Unit>
{
    public async Task<Unit> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new InvalidOperationException("User is not authenticated.");
        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (!passwordHashingService.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("Mevcut şifre hatalı.");
        }

        user.PasswordHash = passwordHashingService.HashPassword(request.NewPassword);
        await repository.ReplaceAsync(user, cancellationToken);

        // Şifre değişince diğer cihazlardaki oturumlar kapatılır: çalınmış bir yenileme
        // token'ı, şifre değiştirildikten sonra işe yaramamalı.
        var tokens = await unitOfWork.Repository<RefreshToken>()
            .FindAsync(token => token.UserId == user.Id && token.RevokedAt == null, cancellationToken);
        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            await unitOfWork.Repository<RefreshToken>().ReplaceAsync(token, cancellationToken);
        }

        return Unit.Value;
    }
}
