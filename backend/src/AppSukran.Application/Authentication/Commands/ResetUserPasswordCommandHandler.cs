using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class ResetUserPasswordCommandHandler(IUnitOfWork unitOfWork, IPasswordHashingService passwordHashingService, IAuditLogService auditLogService, ICurrentUserService currentUserService) : IRequestHandler<ResetUserPasswordCommand, Unit>
{
    public async Task<Unit> Handle(ResetUserPasswordCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        user.PasswordHash = passwordHashingService.HashPassword(request.NewPassword);
        await repository.ReplaceAsync(user, cancellationToken);
        await auditLogService.RecordAsync("UserPasswordReset", nameof(User), user.Id, "Password reset by SuperAdmin.", currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}