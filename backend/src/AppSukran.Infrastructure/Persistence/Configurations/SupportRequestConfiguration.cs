using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class SupportRequestConfiguration : IEntityTypeConfiguration<SupportRequest>
{
    public void Configure(EntityTypeBuilder<SupportRequest> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(request => request.RestaurantId).HasMaxLength(32);
        builder.Property(request => request.BusinessName).HasMaxLength(200).IsRequired();
        builder.Property(request => request.Content).HasMaxLength(2000);
        builder.Property(request => request.Phone).HasMaxLength(30);
    }
}
