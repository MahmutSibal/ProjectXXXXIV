using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(subscription => subscription.RestaurantId).HasMaxLength(32).IsRequired();

        // Her restoranın tek bir abonelik kaydı olur.
        builder.HasIndex(subscription => subscription.RestaurantId).IsUnique();
        builder.HasIndex(subscription => new { subscription.Status, subscription.CurrentPeriodEnd });

        builder.OwnsMany(subscription => subscription.Payments, payment =>
        {
            payment.ToTable("SubscriptionPayments");
            payment.WithOwner().HasForeignKey("SubscriptionId");
            payment.HasKey(p => p.Id);
            payment.Property(p => p.Id).HasMaxLength(32).ValueGeneratedNever();
            payment.Property(p => p.TransactionId).HasMaxLength(200);
            payment.Property(p => p.Provider).HasMaxLength(50).IsRequired();
        });
        builder.Navigation(subscription => subscription.Payments).AutoInclude();
    }
}
