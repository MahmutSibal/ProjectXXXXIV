using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(ev => ev.RestaurantId).HasMaxLength(32).IsRequired();
        builder.Property(ev => ev.Title).HasMaxLength(200).IsRequired();
        builder.Property(ev => ev.Description).HasMaxLength(2000);
        builder.Property(ev => ev.ImageUrl).HasMaxLength(1000);
        builder.Property(ev => ev.Location).HasMaxLength(500);
        builder.Property(ev => ev.Tags).HasJsonStringListConversion();

        builder.HasIndex(ev => ev.RestaurantId);
    }
}
