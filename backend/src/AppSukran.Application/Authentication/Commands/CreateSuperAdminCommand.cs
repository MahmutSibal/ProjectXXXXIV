using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using AppSukran.Domain.Enums;
using FluentValidation;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

/// <summary>
/// Mevcut bir platform yöneticisinin yeni bir platform yöneticisi hesabı açması.
/// Sıradan kullanıcı oluşturma ucundan (CreateUserCommand) ayrıdır: orada SuperAdmin
/// rolü bilerek engellenir; burada ise yalnızca SuperAdmin çağırabilir, parola kuralı
/// daha sıkıdır ve işlem denetim kaydına yazılır.
/// </summary>
public sealed record CreateSuperAdminCommand(string Name, string Email, string Password) : IRequest<string>;

public sealed class CreateSuperAdminCommandValidator : AbstractValidator<CreateSuperAdminCommand>
{
    public CreateSuperAdminCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(250);
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(12).WithMessage("Yönetici şifresi en az 12 karakter olmalı.")
            .MaximumLength(200)
            .Matches("[a-z]").WithMessage("Şifre en az bir küçük harf içermeli.")
            .Matches("[A-Z]").WithMessage("Şifre en az bir büyük harf içermeli.")
            .Matches("[0-9]").WithMessage("Şifre en az bir rakam içermeli.")
            .Matches("[^a-zA-Z0-9]").WithMessage("Şifre en az bir özel karakter içermeli.");
    }
}

public sealed class CreateSuperAdminCommandHandler(
    IUnitOfWork unitOfWork,
    IPasswordHashingService passwordHashingService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService) : IRequestHandler<CreateSuperAdminCommand, string>
{
    public async Task<string> Handle(CreateSuperAdminCommand request, CancellationToken cancellationToken)
    {
        if (!currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            throw new UnauthorizedAccessException("Yönetici hesabını yalnızca platform yöneticisi açabilir.");
        }

        var repository = unitOfWork.Repository<User>();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await repository.AnyAsync(user => user.Email == normalizedEmail, cancellationToken))
        {
            throw new InvalidOperationException("Bu e-posta adresiyle zaten bir hesap var.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHashingService.HashPassword(request.Password),
            Role = UserRole.SuperAdmin,
            IsActive = true,
        };

        await repository.InsertAsync(user, cancellationToken);
        await auditLogService.RecordAsync(
            "SuperAdminCreated", nameof(User), user.Id,
            $"Platform yöneticisi hesabı açıldı: {normalizedEmail}.",
            currentUserService.UserId, cancellationToken);

        return user.Id;
    }
}
