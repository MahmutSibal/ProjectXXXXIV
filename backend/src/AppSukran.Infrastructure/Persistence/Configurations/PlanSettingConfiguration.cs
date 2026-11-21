using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class PlanSettingConfiguration : IEntityTypeConfiguration<PlanSetting>
{
    public void Configure(EntityTypeBuilder<PlanSetting> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(setting => setting.Plan).HasConversion<int>();
        builder.HasIndex(setting => setting.Plan).IsUnique();
        builder.Property(setting => setting.DisplayName).HasMaxLength(40).IsRequired();
        builder.Property(setting => setting.Summary).HasMaxLength(300).IsRequired();
        builder.Property(setting => setting.Bullets).HasMaxLength(2000).IsRequired();
        builder.Property(setting => setting.IsVisible).HasDefaultValue(true);
    }
}

public sealed class PlanCatalogSettingsConfiguration : IEntityTypeConfiguration<PlanCatalogSettings>
{
    public void Configure(EntityTypeBuilder<PlanCatalogSettings> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(settings => settings.PriceVersion).HasMaxLength(40).IsRequired();
    }
}
