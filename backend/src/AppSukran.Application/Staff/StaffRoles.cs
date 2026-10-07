using AppSukran.Domain.Enums;

namespace AppSukran.Application.Staff;

// İşletme sahibine bağlı çalışan rolleri.
public static class StaffRoles
{
    public static readonly IReadOnlyCollection<UserRole> All = new[]
    {
        UserRole.Kitchen,
        UserRole.Waiter
    };

    public static bool IsStaffRole(UserRole role) => role is UserRole.Kitchen or UserRole.Waiter;
}
