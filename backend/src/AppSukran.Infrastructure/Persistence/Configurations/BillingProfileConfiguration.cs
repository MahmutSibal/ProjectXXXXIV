using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class BillingProfileConfiguration : IEntityTypeConfiguration<BillingProfile>
{
    public void Configure(EntityTypeBuilder<BillingProfile> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(profile => profile.RestaurantId).HasMaxLength(32).IsRequired();
        builder.Property(profile => profile.ContactName).HasMaxLength(150).IsRequired();
        builder.Property(profile => profile.Email).HasMaxLength(320).IsRequired();
        builder.Property(profile => profile.Phone).HasMaxLength(20).IsRequired();
        builder.Property(profile => profile.NationalId).HasMaxLength(11).IsRequired();
        builder.Property(profile => profile.MersisNumber).HasMaxLength(16);
        builder.Property(profile => profile.AddressLine).HasMaxLength(500).IsRequired();
        builder.Property(profile => profile.City).HasMaxLength(100).IsRequired();
        builder.Property(profile => profile.Country).HasMaxLength(100).IsRequired();
        builder.Property(profile => profile.PostalCode).HasMaxLength(10).IsRequired();

        // Her restoranın tek fatura profili olur.
        builder.HasIndex(profile => profile.RestaurantId).IsUnique();

        // Hesaplanan maskeler veritabanına yazılmaz.
        builder.Ignore(profile => profile.MaskedNationalId);
        builder.Ignore(profile => profile.MaskedMersisNumber);
        builder.Ignore(profile => profile.IsComplete);
    }
}
