using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed class SetStaffActiveCommandHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService,
    ISubscriptionGuard subscriptionGuard) : IRequestHandler<SetStaffActiveCommand>
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

        // Pasif hesabı yeniden açmak da yeni hesap eklemek gibi paket limitine tabidir.
        if (request.IsActive && !user.IsActive)
        {
            await subscriptionGuard.EnsureCanAddStaffAsync(restaurantId, user.Role, cancellationToken);
        }

        user.IsActive = request.IsActive;
        await repository.ReplaceAsync(user, cancellationToken);
    }
}
