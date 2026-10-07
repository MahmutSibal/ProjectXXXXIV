using AppSukran.Application.Abstractions.Persistence;
using AppSukran.Application.Abstractions.Security;
using AppSukran.Application.Common.Models;
using AppSukran.Domain.Entities;
using MediatR;

namespace AppSukran.Application.Staff.Queries;

public sealed class GetStaffQueryHandler(
    IUnitOfWork unitOfWork,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetStaffQuery, IReadOnlyCollection<UserResponse>>
{
    public async Task<IReadOnlyCollection<UserResponse>> Handle(GetStaffQuery request, CancellationToken cancellationToken)
    {
        var restaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(restaurantId))
        {
            throw new UnauthorizedAccessException("Current user is not associated with a restaurant.");
        }

        var staff = await unitOfWork.Repository<User>().FindAsync(
            user => user.RestaurantId == restaurantId
                && (user.Role == Domain.Enums.UserRole.Kitchen || user.Role == Domain.Enums.UserRole.Waiter),
            cancellationToken);

        return staff
            .OrderBy(user => user.Name)
            .Select(user => new UserResponse(user.Id, user.Name, user.Email, user.Role, user.RestaurantId, user.IsActive))
            .ToList();
    }
}
