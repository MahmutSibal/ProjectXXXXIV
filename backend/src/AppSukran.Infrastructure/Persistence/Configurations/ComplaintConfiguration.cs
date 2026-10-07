using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class ComplaintConfiguration : IEntityTypeConfiguration<Complaint>
{
    public void Configure(EntityTypeBuilder<Complaint> builder)
    {
        builder.ConfigureAggregateRoot();
        builder.Property(complaint => complaint.RestaurantId).HasMaxLength(32);
        builder.Property(complaint => complaint.RestaurantName).HasMaxLength(200);
        builder.Property(complaint => complaint.UserName).HasMaxLength(200);
        builder.Property(complaint => complaint.Content).HasMaxLength(2000);
        builder.Property(complaint => complaint.Response).HasMaxLength(2000);
    }
}
