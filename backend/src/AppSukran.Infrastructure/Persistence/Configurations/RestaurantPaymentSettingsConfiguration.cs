using AppSukran.Domain.Common;
using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class RestaurantPaymentSettingsConfiguration : IEntityTypeConfiguration<RestaurantPaymentSettings>
{
    public void Configure(EntityTypeBuilder<RestaurantPaymentSettings> builder)
    {
        // Anahtar (Id) restoran kimliğidir: her restoranın tek ayar satırı olur.
        builder.ConfigureAggregateRoot();

        builder.Property(settings => settings.Iban).HasMaxLength(TurkishIban.Length).IsRequired();
        builder.Property(settings => settings.AccountHolderBusinessName).HasMaxLength(200).IsRequired();
        builder.Property(settings => settings.AccountHolderFullName).HasMaxLength(150).IsRequired();
        builder.Property(settings => settings.CommissionPercent).HasPrecision(5, 2);

        builder.Ignore(settings => settings.RestaurantId);
    }
}
