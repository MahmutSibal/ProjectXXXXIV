using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class PlatformPaymentSettingsConfiguration : IEntityTypeConfiguration<PlatformPaymentSettings>
{
    public void Configure(EntityTypeBuilder<PlatformPaymentSettings> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(settings => settings.BankName).HasMaxLength(100).IsRequired();
        builder.Property(settings => settings.AccountHolder).HasMaxLength(150).IsRequired();
        builder.Property(settings => settings.Iban).HasMaxLength(34).IsRequired();
        builder.Property(settings => settings.Branch).HasMaxLength(100).IsRequired();
        builder.Property(settings => settings.PaymentNote).HasMaxLength(500).IsRequired();
        builder.Property(settings => settings.BankTransferEnabled).HasDefaultValue(true);
        builder.Property(settings => settings.ShowIyzicoLogos).HasDefaultValue(true);
        builder.Property(settings => settings.CardPaymentsEnabled).HasDefaultValue(true);
    }
}
