using AppSukran.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AppSukran.Infrastructure.Persistence.Configurations;

public sealed class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> builder)
    {
        builder.ConfigureAggregateRoot();

        builder.Property(campaign => campaign.Subject).HasMaxLength(150).IsRequired();
        builder.Property(campaign => campaign.Body).HasMaxLength(5000).IsRequired();
        builder.Property(campaign => campaign.Status).HasMaxLength(20).IsRequired();
        builder.Property(campaign => campaign.CreatedByUserId).HasMaxLength(64);
        builder.Property(campaign => campaign.ImageUrl).HasMaxLength(500);
        builder.Property(campaign => campaign.ButtonText).HasMaxLength(40);
        builder.Property(campaign => campaign.ButtonUrl).HasMaxLength(500);
        builder.HasIndex(campaign => campaign.CreatedAt);
    }
}
