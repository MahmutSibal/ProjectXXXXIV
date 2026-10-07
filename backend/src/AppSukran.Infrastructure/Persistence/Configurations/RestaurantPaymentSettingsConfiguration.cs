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

        builder.Property(settings => settings.Provider).HasMaxLength(32).IsRequired();
        builder.Property(settings => settings.ApiKeyProtected).HasMaxLength(1024).IsRequired();
        builder.Property(settings => settings.SecretKeyProtected).HasMaxLength(1024).IsRequired();
        builder.Property(settings => settings.BaseUrl).HasMaxLength(200).IsRequired();

        builder.Ignore(settings => settings.RestaurantId);
    }
}
