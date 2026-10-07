using AppSukran.Application.Abstractions.Security;
using AppSukran.Domain.Enums;

namespace AppSukran.Application.Common.Security;

public sealed class RestaurantAccessGuard(ICurrentUserService currentUserService) : IRestaurantAccessGuard
{
    public void EnsureCanAccess(string? restaurantId)
    {
        // SuperAdmin tüm restoranlara erişebilir.
        if (currentUserService.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            return;
        }

        var scopedRestaurantId = currentUserService.RestaurantId;
        if (string.IsNullOrWhiteSpace(scopedRestaurantId) ||
            !string.Equals(scopedRestaurantId, restaurantId, StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("You do not have access to this restaurant's resources.");
        }
    }
}
