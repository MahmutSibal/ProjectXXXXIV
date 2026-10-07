using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Authentication.Commands;

public sealed class UpdateUserRoleCommandHandler(IUnitOfWork unitOfWork, IAuditLogService auditLogService, ICurrentUserService currentUserService) : IRequestHandler<UpdateUserRoleCommand, Unit>
{
    public async Task<Unit> Handle(UpdateUserRoleCommand request, CancellationToken cancellationToken)
    {
        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        user.Role = request.Role;
        user.RestaurantId = request.RestaurantId;
        await repository.ReplaceAsync(user, cancellationToken);
        await auditLogService.RecordAsync("UserRoleUpdated", nameof(User), user.Id, $"Role changed to {request.Role}.", currentUserService.UserId, cancellationToken);

        return Unit.Value;
    }
}