using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(item => item.RestaurantId).HasMaxLength(32).IsRequired();
        builder.Property(item => item.Category).HasMaxLength(200);
        builder.Property(item => item.Name).HasMaxLength(200).IsRequired();
        builder.Property(item => item.ImageUrl).HasMaxLength(1000);
        builder.Property(item => item.Recipe).HasMaxLength(4000);
        builder.Property(item => item.Ingredients).HasJsonStringListConversion();

        builder.HasIndex(item => item.RestaurantId);
        builder.HasIndex(item => new { item.RestaurantId, item.IsAvailable });
    }
}
