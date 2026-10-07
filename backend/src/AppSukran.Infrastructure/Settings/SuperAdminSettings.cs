using AppSukran.Domain.Enums;

namespace AppSukran.Infrastructure.Settings;

public sealed class SuperAdminSettings
{
    public bool Enabled { get; set; } = true;
    public string Name { get; set; } = "Super Admin";
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.SuperAdmin;
}