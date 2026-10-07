using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed class SetStaffActiveCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService) : IRequestHandler<SetStaffActiveCommand>
{
    public async Task Handle(SetStaffActiveCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var repository = unitOfWork.Repository<User>();
        var user = await repository.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("Staff member not found.");

        // Yalnızca kendi restoranına ait personeli ve sadece personel rollerini yönetebilir.
        if (user.RestaurantId != restaurantId || !StaffRoles.IsStaffRole(user.Role))
        {
            throw new UnauthorizedAccessException("You cannot manage this user.");
        }

        user.IsActive = request.IsActive;
        await repository.ReplaceAsync(user, cancellationToken);
    }
}
