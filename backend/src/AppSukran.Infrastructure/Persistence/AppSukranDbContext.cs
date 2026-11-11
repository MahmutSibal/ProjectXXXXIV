using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AppSukran.Infrastructure.Persistence;

public sealed class AppSukranDbContext : DbContext
{
    public AppSukranDbContext(DbContextOptions<AppSukranDbContext> options, AppSukran.Application.Abstractions.Security.ISecretProtectionService? protector = null)
        : base(options)
    {
        // T.C. kimlik no şifrelemesi için (bkz. PersonalDataProtection).
        if (protector is not null)
        {
            PersonalDataProtection.Protector ??= protector;
        }
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<CardPayment> CardPayments => Set<CardPayment>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<SupportRequest> SupportRequests => Set<SupportRequest>();
    public DbSet<RefundRequest> RefundRequests => Set<RefundRequest>();
    public DbSet<Complaint> Complaints => Set<Complaint>();
    public DbSet<PhoneVerification> PhoneVerifications => Set<PhoneVerification>();
    public DbSet<BillingProfile> BillingProfiles => Set<BillingProfile>();
    public DbSet<PlatformPaymentSettings> PlatformPaymentSettings => Set<PlatformPaymentSettings>();
    public DbSet<RestaurantPaymentSettings> RestaurantPaymentSettings => Set<RestaurantPaymentSettings>();
    public DbSet<MaintenanceSettings> MaintenanceSettings => Set<MaintenanceSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppSukranDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
