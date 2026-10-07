using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class MaintenanceSettingsConfiguration : IEntityTypeConfiguration<MaintenanceSettings>
{
    public void Configure(EntityTypeBuilder<MaintenanceSettings> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(settings => settings.IsEnabled).HasDefaultValue(false);
        builder.Property(settings => settings.ServerDisabled).HasDefaultValue(false);
        builder.Property(settings => settings.Message).HasMaxLength(300).IsRequired();
    }
}
