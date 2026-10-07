using AppSukran.Application.Abstractions.Logging;
using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Security;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Staff.Commands;

public sealed class CreateStaffCommandHandler(
    IUnitOfWork unitOfWork,
    IPasswordHashingService passwordHashingService,
    IAuditLogService auditLogService,
    ICurrentUserService currentUserService,
    ISubscriptionGuard subscriptionGuard) : IRequestHandler<CreateStaffCommand, string>
{
    public async Task<string> Handle(CreateStaffCommand request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        // Mutfak/garson panelleri yalnızca Standart pakette var.
        await subscriptionGuard.EnsureFeatureAsync(restaurantId, SubscriptionFeature.StaffPanels, cancellationToken);

        if (!StaffRoles.IsStaffRole(request.Role))
        {
            throw new InvalidOperationException("Only Kitchen or Waiter roles can be assigned to staff.");
        }

        var repository = unitOfWork.Repository<User>();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await repository.AnyAsync(user => user.Email == normalizedEmail, cancellationToken))
        {
            throw new InvalidOperationException("Email already exists.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHashingService.HashPassword(request.Password),
            Role = request.Role,
            RestaurantId = restaurantId,
            IsActive = true
        };

        await repository.InsertAsync(user, cancellationToken);
        await auditLogService.RecordAsync("StaffCreated", nameof(User), user.Id, $"Staff created with role {request.Role}.", currentUserService.UserId, cancellationToken);

        return user.Id;
    }
}
