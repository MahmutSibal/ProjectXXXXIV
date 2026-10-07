using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(category => category.RestaurantId).HasMaxLength(32).IsRequired();
        builder.Property(category => category.Name).HasMaxLength(200).IsRequired();
        builder.Property(category => category.Description).HasMaxLength(1000);
        builder.Property(category => category.ImageUrl).HasMaxLength(1000);
        builder.HasIndex(category => category.RestaurantId);
    }
}
