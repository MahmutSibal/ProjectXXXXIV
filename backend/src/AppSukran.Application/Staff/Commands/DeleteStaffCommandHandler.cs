using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed class DeleteStaffCommandHandler(
    IUnitOfWork unitOfWork,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService) : IRequestHandler<DeleteStaffCommand>
{
    public async Task Handle(DeleteStaffCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("Staff member not found.");

        if (user.RestaurantId != restaurantId || !StaffRoles.IsStaffRole(user.Role))
        {
            throw new UnauthorizedAccessException("You cannot manage this user.");
        }

        await repository.DeleteAsync(user.Id, cancellationToken);
        await auditLogService.RecordAsync("StaffDeleted", nameof(User), user.Id, "Staff removed.", currentUserService.UserId, cancellationToken);
    }
}
