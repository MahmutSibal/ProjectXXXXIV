using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class RestaurantConfiguration : IEntityTypeConfiguration<Restaurant>
{
    public void Configure(EntityTypeBuilder<Restaurant> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(restaurant => restaurant.Name).HasMaxLength(200).IsRequired();
        builder.Property(restaurant => restaurant.Slug).HasMaxLength(200).IsRequired();
        builder.Property(restaurant => restaurant.OwnerId).HasMaxLength(32).IsRequired();
        builder.Property(restaurant => restaurant.Address).HasMaxLength(500);

        builder.HasIndex(restaurant => restaurant.OwnerId);
        builder.HasIndex(restaurant => restaurant.Slug)
            .IsUnique()
            .HasFilter("[Slug] <> ''");

        builder.OwnsOne(restaurant => restaurant.Financials, financials =>
        {
            financials.Property(f => f.TotalRevenue).HasColumnName("TotalRevenue");
            financials.Property(f => f.MonthlyProfit).HasColumnName("MonthlyProfit");
        });

        builder.OwnsMany(restaurant => restaurant.Tables, table =>
        {
            table.ToTable("RestaurantTables");
            table.WithOwner().HasForeignKey("RestaurantId");
            table.HasKey(t => t.Id);
            table.Property(t => t.Id).HasMaxLength(32).ValueGeneratedNever();
            table.Property(t => t.QrToken).HasMaxLength(64);
            table.Property(t => t.TableSessionId).HasMaxLength(64);
            table.HasIndex("RestaurantId", nameof(RestaurantTable.TableNo));
        });
        builder.Navigation(restaurant => restaurant.Tables).AutoInclude();
    }
}
